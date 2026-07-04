import { z } from 'zod';

// Raise exception modal — validates all fields at once so every inline error can be
// shown simultaneously (COLOUR_SPEC C5: never just the first error).
export const raiseExceptionSchema = z.object({
  title: z.string().trim().min(1, 'Exception title is required.'),
  severity: z.enum(['critical', 'high', 'medium'], { message: 'Severity is required.' }),
  source_system: z.string().min(1),
  owner_id: z.string().trim().min(1, 'Owner is required.'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

export type RaiseExceptionForm = z.infer<typeof raiseExceptionSchema>;

export const escalateSchema = z.object({
  target_user_id: z.string().trim().min(1, 'Escalation target is required.'),
  deadline: z.string().optional(),
  note: z.string().optional(),
});

export type EscalateForm = z.infer<typeof escalateSchema>;

export const ruleSchema = z.object({
  name: z.string().trim().min(1, 'Rule name is required.'),
  condition_dsl: z.string().trim().min(1, 'Condition is required.'),
  severity: z.enum(['critical', 'high', 'medium']),
  route_to_role: z.string().min(1),
  source_system: z.string().min(1),
});

export type RuleForm = z.infer<typeof ruleSchema>;

// Runs a zod schema and returns a field->message map with every failing field present
// (not just the first), for forms that must show all inline errors at once.
export function validateAll<T>(schema: z.ZodType<T>, data: unknown): { ok: true; data: T } | { ok: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_root';
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

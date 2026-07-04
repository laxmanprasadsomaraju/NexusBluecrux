// Seeded demo accounts (backend/README.md "log in as" table). POST /auth/login only
// needs the email — this list drives the persona picker on /login.
export interface DemoUser {
  name: string;
  email: string;
  role: 'planner' | 'manager' | 'director' | 'partner' | 'admin';
  title: string;
  team: string;
}

export const DEMO_USERS: DemoUser[] = [
  { name: 'Eric Rousseau', email: 'eric.rousseau@nexus-demo.io', role: 'planner', title: 'QC Ops Lead', team: 'QC' },
  { name: 'Maria Kovacs', email: 'maria.kovacs@nexus-demo.io', role: 'manager', title: 'External Manufacturing Manager', team: 'External Mfg' },
  { name: 'Jana Lindqvist', email: 'jana.lindqvist@nexus-demo.io', role: 'planner', title: 'SC Planner', team: 'SC Planning' },
  { name: 'Tom Berger', email: 'tom.berger@nexus-demo.io', role: 'manager', title: 'Procurement Lead', team: 'Procurement' },
  { name: 'Sofie De Vries', email: 'sofie.devries@nexus-demo.io', role: 'planner', title: 'Demand Planner', team: 'Demand Planning' },
  { name: 'A. Janssens', email: 'a.janssens@nexus-demo.io', role: 'director', title: 'Supply Chain Director', team: 'Supply Chain' },
  { name: 'Nina Vos', email: 'nina.vos@nexus-demo.io', role: 'admin', title: 'IT / Operations Admin', team: 'IT / Operations' },
  { name: 'Lonza Portal', email: 'lonza.portal@nexus-demo.io', role: 'partner', title: 'Lonza Partner Contact', team: 'Partner: Lonza' },
];

export const ROLE_LABELS: Record<string, string> = {
  planner: 'Planner',
  manager: 'Manager',
  director: 'Director',
  partner: 'Partner',
  admin: 'Admin',
};

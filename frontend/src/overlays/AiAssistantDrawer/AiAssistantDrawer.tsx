import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Drawer } from '../../components/Drawer/Drawer';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Form/Field';
import { Spinner } from '../../components/Spinner/Spinner';
import { useUi } from '../../hooks/useUi';
import * as assistantApi from '../../api/assistant';
import { ApiError } from '../../api/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const PROMPTS = ["What's my biggest risk?", 'Summarise the queue', 'Which partner is slow?'];

export function AiAssistantDrawer() {
  const { closeChat } = useUi();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', text: "Hi — I'm the NEXUS assistant. Ask me about your open exceptions, partners, value at risk, or overdue actions." },
  ]);
  const [input, setInput] = useState('');

  const mutation = useMutation({
    mutationFn: (message: string) => assistantApi.queryAssistant(message),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { id: `${Date.now()}-a`, role: 'assistant', text: res.reply }]);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-e`, role: 'assistant', text: err instanceof ApiError ? err.message : 'Something went wrong.' },
      ]);
    },
  });

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    setMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: 'user', text: trimmed }]);
    setInput('');
    mutation.mutate(trimmed);
  }

  return (
    <Drawer
      width={360}
      onClose={closeChat}
      header={
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>NEXUS assistant</div>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--purple)', background: 'var(--purple-light)', borderRadius: 4, padding: '3px 8px' }}>
            AI
          </span>
          <button onClick={closeChat} style={{ cursor: 'pointer', color: 'var(--timestamp-gray)', background: 'none', border: 'none', display: 'flex', marginLeft: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '85%',
                  fontSize: 12,
                  lineHeight: 1.5,
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: m.role === 'user' ? 'var(--cyan-primary)' : 'var(--light-gray)',
                  color: m.role === 'user' ? 'var(--navy-dark)' : 'var(--dark-gray)',
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {mutation.isPending && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Spinner size={14} color="var(--purple)" />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 8 }}>
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--purple)',
                background: 'transparent',
                border: '0.5px solid var(--purple)',
                borderRadius: 20,
                padding: '4px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {p}
            </button>
          ))}
        </div>
        <div style={{ borderTop: '0.5px solid var(--mid-gray)', paddingTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send(input);
              }}
              placeholder="Ask about your queue…"
              style={{ flex: 1 }}
            />
            <Button variant="primary" onClick={() => send(input)}>
              Send
            </Button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--purple)', marginTop: 6 }}>AI-generated — always verify before acting.</div>
        </div>
      </div>
    </Drawer>
  );
}

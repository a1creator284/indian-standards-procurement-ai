import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, User } from 'lucide-react';
import type { ChatMessage } from '@/engine/types';
import { useApp } from '@/context/AppContext';
import { api, ApiError } from '@/services/api';
import { Badge, Button, Drawer, cx } from '@/components/ui';
import { Markdown } from '@/components/ui/Markdown';

const SUGGESTIONS = [
  'Why was the top standard recommended?',
  'What related standards should I consider?',
  'Which requirements are missing?',
  'Is any reference potentially outdated?',
  'What testing standards are related?',
  'Which certification applies?',
];

export function CopilotPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { analysis, status } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: question, createdAt: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setBusy(true);
    try {
      const reply = await api.chat(question, analysis, [...messages, userMsg]);
      setMessages((m) => [...m, reply]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The assistant could not answer right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-lg"
      title={
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-fg">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="font-semibold">IS Copilot Assistant</div>
            <div className="text-[11px] text-ink-muted">Answers from retrieved evidence · {status?.mode === 'live' ? 'Live AI' : 'Demo mode'}</div>
          </div>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-4">
          {!messages.length && (
            <div className="rounded-xl border border-dashed border-line bg-surface p-4 text-[13px]">
              <p className="text-ink-muted">
                {analysis ? (
                  <>
                    Context: <span className="font-medium text-ink">{analysis.summary.productDescription}</span> — {analysis.recommendations.length} recommendations loaded.
                  </>
                ) : (
                  'No analysis loaded yet. Ask a search question or run an analysis first for grounded answers.'
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-full border border-line bg-surface-raised px-3 py-1 text-[12px] shadow-sm hover:border-primary hover:text-ink">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cx('flex gap-2.5', m.role === 'user' && 'justify-end')}>
              {m.role === 'assistant' && (
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-fg">
                  <Bot className="size-3.5" />
                </div>
              )}
              <div className={cx('max-w-[85%] rounded-2xl px-3.5 py-2.5', m.role === 'user' ? 'bg-primary text-primary-fg rounded-br-sm' : 'bg-surface border border-line rounded-bl-sm')}>
                {m.role === 'user' ? <p className="text-[13.5px]">{m.content}</p> : <Markdown text={m.content} />}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.citations.slice(0, 5).map((c, j) => (
                      <Badge key={j} tone="navy" title={c.snippet}>
                        {c.standardNumber}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-700">
                  <User className="size-3.5" />
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-[12px] text-ink-muted">
              <span className="size-1.5 animate-pulse-soft rounded-full bg-primary" /> Retrieving evidence…
            </div>
          )}
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}
          <div ref={bottom} />
        </div>
        <form
          className="sticky bottom-0 mt-4 flex gap-2 border-t border-line bg-surface pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about recommendations, gaps, tests, certification…"
            className="h-10 flex-1 rounded-lg border border-line px-3 text-[13px] outline-none focus:border-primary"
            aria-label="Ask the assistant"
          />
          <Button type="submit" size="md" loading={busy} disabled={!input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </Drawer>
  );
}

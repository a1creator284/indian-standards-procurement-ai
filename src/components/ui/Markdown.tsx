import { Fragment, type ReactNode } from 'react';

/**
 * Minimal, dependency-free markdown renderer for engine output
 * (headings, bullets, bold, italics, inline code). No raw HTML is ever rendered.
 */
function inline(text: string, key: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    const tok = m[0];
    if (tok.startsWith('**')) parts.push(<strong key={`${key}-${i++}`}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) parts.push(<code key={`${key}-${i++}`}>{tok.slice(1, -1)}</code>);
    else parts.push(<em key={`${key}-${i++}`}>{tok.slice(1, -1)}</em>);
    last = idx + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`ul-${out.length}`}>
          {list.map((l, i) => (
            <li key={i}>{inline(l, `li-${out.length}-${i}`)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      list.push(line.replace(/^\s*[-*]\s+/, ''));
      return;
    }
    flush();
    if (!line.trim()) return;
    if (line.startsWith('### ')) out.push(<h3 key={i}>{inline(line.slice(4), `h3-${i}`)}</h3>);
    else if (line.startsWith('## ')) out.push(<h2 key={i}>{inline(line.slice(3), `h2-${i}`)}</h2>);
    else if (line.startsWith('# ')) out.push(<h2 key={i}>{inline(line.slice(2), `h1-${i}`)}</h2>);
    else if (line.startsWith('---')) out.push(<hr key={i} className="my-3 border-line" />);
    else out.push(<p key={i}>{inline(line, `p-${i}`)}</p>);
  });
  flush();
  return (
    <div className={`prose-lite text-[13.5px] leading-relaxed ${className ?? ''}`}>
      {out.map((n, i) => (
        <Fragment key={i}>{n}</Fragment>
      ))}
    </div>
  );
}

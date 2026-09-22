import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="page-heading mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div className="flex min-w-0 gap-3">
        <span className="page-heading-mark" aria-hidden="true"><span /></span>
        <div>
          {eyebrow && <div className="label-caps mb-1">{eyebrow}</div>}
          <h1 className="page-heading-title">{title}</h1>
          {description && <p className="page-heading-description">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

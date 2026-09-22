import { Monitor, Moon, Sun, Trash2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { historyStore } from '@/services/history';
import { PageHeader } from '@/components/PageHeader';
import { Button, Card, cx } from '@/components/ui';

export function SettingsPage() {
  const { preference, setPreference } = useTheme();

  const clearData = () => {
    if (confirm('Are you sure you want to clear all local search history? This cannot be undone.')) {
      historyStore.clear();
      alert('Local history cleared.');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader eyebrow="Settings" title="Preferences" description="Manage your application settings and local data." />

      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Appearance</h2>
        <Card className="depth-card p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <ThemeButton
              active={preference === 'light'}
              onClick={() => setPreference('light')}
              icon={<Sun className="size-5" />}
              label="Light"
            />
            <ThemeButton
              active={preference === 'dark'}
              onClick={() => setPreference('dark')}
              icon={<Moon className="size-5" />}
              label="Dark"
            />
            <ThemeButton
              active={preference === 'system'}
              onClick={() => setPreference('system')}
              icon={<Monitor className="size-5" />}
              label="System"
            />
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Data Management</h2>
        <Card className="depth-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="font-medium">Clear Search History</div>
              <p className="text-[13px] text-ink-muted mt-0.5">
                Remove all saved analyses, generated specifications, and graph data stored in this browser.
              </p>
            </div>
            <Button variant="danger" onClick={clearData}>
              <Trash2 className="size-4" /> Clear Local Data
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}

function ThemeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex flex-col items-center gap-3 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover',
        active
          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
          : 'border-line bg-surface hover:bg-surface-raised text-ink-muted hover:text-ink hover:border-line-strong'
      )}
    >
      <div className="grid size-10 place-items-center rounded-lg bg-surface-raised shadow-sm border border-line">
        {icon}
      </div>
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  );
}

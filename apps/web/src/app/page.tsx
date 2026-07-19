import { getTranslations } from 'next-intl/server';

type Health = {
  status: string;
  service: string;
  version: string;
  time: string;
  db: { reachable: boolean; migrationsApplied: boolean };
};

async function getHealth(): Promise<Health | null> {
  const origin = process.env.API_ORIGIN ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${origin}/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Health;
  } catch {
    return null;
  }
}

function Row({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 py-1">
      <span>{label}</span>
      <span style={{ color: ok ? 'var(--color-ok)' : 'var(--color-bad)' }}>{ok ? '✓' : '✕'}</span>
    </li>
  );
}

export default async function Home() {
  const t = await getTranslations('home');
  const health = await getHealth();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-12">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">{t('title')}</h1>
        <p style={{ color: 'var(--color-muted)' }}>{t('tagline')}</p>
      </header>

      <section
        className="rounded-2xl p-5 shadow-sm"
        style={{ background: 'var(--color-surface)' }}
      >
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
          {t('healthHeading')}
        </h2>
        {health ? (
          <ul className="text-sm">
            <Row label={t('apiUp')} ok={health.status === 'ok'} />
            <Row label={t('dbReachable')} ok={health.db.reachable} />
            <Row label={t('migrationsApplied')} ok={health.db.migrationsApplied} />
            <li className="flex items-center justify-between gap-4 py-1" style={{ color: 'var(--color-muted)' }}>
              <span>{t('version')}</span>
              <span>{health.version}</span>
            </li>
          </ul>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-bad)' }}>
            {t('apiDown')}
          </p>
        )}
      </section>

      <p className="text-center text-xs" style={{ color: 'var(--color-muted)' }}>
        {t('walkingSkeleton')}
      </p>
    </main>
  );
}

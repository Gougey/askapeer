import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { API_ORIGIN } from '@/lib/api';
import { requireAppAccess } from '@/lib/onboarding';
import { STAT_COLOUR, StatIcon } from '@/components/StatIcons';

type Profile = {
  handleId: string;
  handleName: string;
  kudosTotal: number;
  insightfulTotal: number;
  usefulTotal: number;
  memberSinceYear: number;
  status: string;
};

/**
 * F1 — my profile. Deliberately thin: there are no member-editable profile fields
 * (EPIC-B §5, gap G-23), so this is the public profile plus a way out. Settings screens
 * arrive with the epics that own them (notifications S10, interests S8, billing S12).
 */
export default async function ProfilePage() {
  const { token, state } = await requireAppAccess();
  const t = await getTranslations('shell.profileScreen');

  const res = await fetch(`${API_ORIGIN}/v1/handles/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const profile = (await res.json()) as Profile;

  return (
    <main className="flex min-h-dvh flex-col gap-6 px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{profile.handleName}</h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('memberSince', { year: profile.memberSinceYear })}
        </p>
      </div>

      {/* Standing by kind (Insightful, Useful), each in its colour once it is above zero. */}
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ['insightful', profile.insightfulTotal],
            ['useful', profile.usefulTotal],
          ] as const
        ).map(([kind, total]) => (
          <div key={kind} className="rounded-lg p-4" style={{ background: 'var(--color-surface)' }}>
            <p
              className="flex items-center gap-2 text-2xl font-semibold"
              style={{ color: total > 0 ? STAT_COLOUR[kind].fg : 'var(--color-muted)' }}
            >
              <StatIcon kind={kind} className="size-[22px] shrink-0" />
              {total}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t(kind)}</p>
          </div>
        ))}
      </div>

      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('identityNote')}</p>

      {/* Entry to the settings hub (F3) — the profile is where the screen spec puts it. */}
      <Link
        href="/settings"
        className="border px-3 py-2 text-center text-sm font-medium"
        style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius-pill)' }}
      >
        {t('settings')}
      </Link>

      {state.isAdmin && (
        <Link
          href="/admin"
          className="rounded-lg border px-3 py-2 text-center text-sm font-medium"
          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
        >
          {t('adminConsole')}
        </Link>
      )}

    </main>
  );
}

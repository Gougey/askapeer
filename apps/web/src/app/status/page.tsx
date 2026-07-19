import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

type Status = { verificationStatus: string; statusUpdatedAt: string };

const KNOWN = ['pending', 'needs_more_info', 'rejected'];

// A5 — the verification holding page. The only screen a non-approved session reaches.
export default async function StatusPage() {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const res = await fetch(`${API_ORIGIN}/v1/auth/verification-status`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 401) redirect('/'); // session gone/expired → back to sign-in
  const status = (await res.json()) as Status;

  const t = await getTranslations('holding');
  const key = KNOWN.includes(status.verificationStatus) ? status.verificationStatus : 'default';

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-12 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t(`${key}.title`)}</h1>
        <p style={{ color: 'var(--color-muted)' }}>{t(`${key}.body`)}</p>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        {key === 'rejected' && (
          <Link href="/register" className="underline">{t('registerAgain')}</Link>
        )}
        <Link href="/auth/signout" className="underline" style={{ color: 'var(--color-muted)' }}>
          {t('signOut')}
        </Link>
      </div>
    </main>
  );
}

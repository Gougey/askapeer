import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';
import { BrandLockup } from '@/components/Brand';
import { SimulatedCapture } from './SimulatedCapture';

type CaptureResponse = {
  session: { provider: string; captureToken: string; expiresAt: string } | null;
  simulated: boolean;
};

/**
 * Screen A4 — the identity-document check.
 *
 * Until an Onfido account exists this renders a stand-in that lets the applicant pick
 * the result the provider would have returned. The real SDK mounts in the same slot;
 * everything either side of this component (session creation, callback handling, the
 * decision table) is already the production path.
 */
export default async function IdentityCheckPage() {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const res = await fetch(`${API_ORIGIN}/v1/auth/verification/capture`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 401) redirect('/');
  const { session, simulated } = (await res.json()) as CaptureResponse;

  const t = await getTranslations('identityCheck');

  // No open session — the check is done, or never got this far (register lookup
  // failed, so the applicant is already with an admin).
  if (!session) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-12 text-center">
        <BrandLockup className="mx-auto h-14 w-auto" />
        <h1 className="text-2xl font-semibold">{t('noSession.title')}</h1>
        <p style={{ color: 'var(--color-muted)' }}>{t('noSession.body')}</p>
        <Link href="/status" className="underline text-sm">{t('backToStatus')}</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <BrandLockup className="mx-auto h-14 w-auto" />
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('body')}</p>
      </div>

      {simulated ? (
        <SimulatedCapture captureToken={session.captureToken} />
      ) : (
        // The real Onfido SDK mounts here once an account exists.
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('providerUnavailable')}</p>
      )}

      <Link
        href="/status"
        className="text-center text-sm underline"
        style={{ color: 'var(--color-muted)' }}
      >
        {t('backToStatus')}
      </Link>
    </main>
  );
}

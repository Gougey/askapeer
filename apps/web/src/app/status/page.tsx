import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { API_ORIGIN } from '@/lib/api';
import { requireSession } from '@/lib/onboarding';
import { ResubmitButton } from './ResubmitButton';
import { StatusPoller } from './StatusPoller';

type Capture = { session: { captureToken: string } | null };

const KNOWN = ['pending', 'needs_more_info', 'approved_verified', 'rejected'];

// A5 — the verification holding page. The only screen a non-approved session reaches.
export default async function StatusPage() {
  // Also moves them on if verification passed while they were sitting here — to the
  // handle step (A6), or into the app if they've already been through onboarding.
  const { token, state: status } = await requireSession('/status');
  const authed = { Authorization: `Bearer ${token}` };

  // Is there an identity check waiting on the applicant? If so the holding page's job
  // is to send them back to it, not to tell them to sit tight.
  const captureRes = await fetch(`${API_ORIGIN}/v1/auth/verification/capture`, {
    headers: authed,
    cache: 'no-store',
  });
  const capture = captureRes.ok ? ((await captureRes.json()) as Capture) : { session: null };

  const t = await getTranslations('holding');
  const key = KNOWN.includes(status.verificationStatus) ? status.verificationStatus : 'default';
  const awaitingCapture = key === 'pending' && capture.session !== null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-12 text-center">
      <StatusPoller current={status.verificationStatus} />

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">
          {awaitingCapture ? t('awaitingCapture.title') : t(`${key}.title`)}
        </h1>
        <p style={{ color: 'var(--color-muted)' }}>
          {awaitingCapture ? t('awaitingCapture.body') : t(`${key}.body`)}
        </p>
        {key === 'needs_more_info' && status.needsMoreInfoReason && (
          <p className="text-sm" style={{ color: 'var(--color-bad)' }}>
            {status.needsMoreInfoReason}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 text-sm">
        {awaitingCapture && (
          <Link
            href="/verify/identity"
            className="rounded-lg px-3 py-2 font-medium text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            {t('continueCheck')}
          </Link>
        )}
        {/* G-1: the applicant's own way out of needs_more_info. */}
        {key === 'needs_more_info' && <ResubmitButton />}
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

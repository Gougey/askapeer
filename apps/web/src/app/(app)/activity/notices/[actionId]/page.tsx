import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { fetchModerationNotice } from '@/lib/notifications';
import { requireAccessToken } from '@/lib/session';

/**
 * E4 — a moderation action taken against the member.
 *
 * Not in the screen spec: EPIC-F defines the actions and their audit trail but never says
 * what the actioned member is shown. A warning with no context is not a warning, so this
 * gives them the three things they need to act on it — what was reported, under what
 * category, and what the moderator decided.
 *
 * It shows neither the reporter nor the moderator. That boundary is enforced in the API
 * (see `moderation-notice.service.ts`), not here — this screen renders what it is given.
 */
export default async function ModerationNoticePage({
  params,
}: {
  params: Promise<{ actionId: string }>;
}) {
  const { actionId } = await params;
  const token = await requireAccessToken();
  const [t, notice] = await Promise.all([
    getTranslations('activity.notice'),
    fetchModerationNotice(actionId, token),
  ]);
  if (!notice) notFound();
  const format = await getFormatter();

  const panel = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius)',
    padding: 'var(--space-4)',
    boxShadow: 'var(--shadow-card)',
  };

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      {/* No inline back link: the app bar carries one on every non-tab screen now, and two
          back affordances on one screen is worse than the none this used to have. */}
      <div className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
        <h1 className="text-xl font-semibold">{t(`action.${notice.action.type}`)}</h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {format.relativeTime(new Date(notice.action.createdAt))}
        </p>
      </div>

      {/* c) the decision and the moderator's comment — the substance of the notice. */}
      <section className="flex flex-col border" style={{ ...panel, gap: 'var(--space-2)' }}>
        <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
          {t('decision')}
        </h2>
        <p className="text-sm">{t(`outcome.${notice.action.type}`)}</p>
        {notice.action.reason ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {t('moderatorComment', { comment: notice.action.reason })}
          </p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('noComment')}</p>
        )}
      </section>

      {/* b) what it was reported as. Category only — never the reporter's own words. */}
      {notice.report && (
        <section className="flex flex-col border" style={{ ...panel, gap: 'var(--space-2)' }}>
          <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
            {t('reportedAs')}
          </h2>
          <p className="text-sm">{t(`category.${notice.report.category}`)}</p>
          <p className="text-xs" style={{ color: 'var(--color-faint)' }}>{t('reporterPrivate')}</p>
        </section>
      )}

      {/* a) the content itself. */}
      {notice.content && (
        <section className="flex flex-col border" style={{ ...panel, gap: 'var(--space-2)' }}>
          <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
            {t(
              notice.content.targetType === 'comment'
                ? 'yourAnswer'
                : notice.content.postType === 'case_discussion'
                  ? 'yourCase'
                  : 'yourQuestion',
            )}
          </h2>
          <p className="text-sm font-medium">{notice.content.postTitle}</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-muted)' }}>
            {notice.content.body}
          </p>
          {notice.content.removed ? (
            <p className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>
              {t('removed')}
            </p>
          ) : notice.content.awaitingCorrection ? (
            /*
              A correction is the one notice that asks the member to do something, so it
              gets the action rather than a link back to the thread — which is hidden
              anyway until they republish. Saying the kudos are safe matters here: the
              member's first fear on being told their case was pulled is that the
              discussion under it is gone.
            */
            <>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-warn)' }}>
                {t('awaitingCorrection')}
              </p>
              <Link
                href={`/create/case/${notice.content.postId}`}
                className="text-sm font-semibold"
                style={{ color: 'var(--color-accent)' }}
              >
                {t('fixAndRepublish')}
              </Link>
            </>
          ) : (
            <Link
              href={`/discussions/${notice.content.postId}`}
              className="text-sm font-semibold"
              style={{ color: 'var(--color-accent)' }}
            >
              {t('openThread')}
            </Link>
          )}
        </section>
      )}

      <p className="text-xs" style={{ color: 'var(--color-faint)' }}>{t('standardsNote')}</p>
    </main>
  );
}

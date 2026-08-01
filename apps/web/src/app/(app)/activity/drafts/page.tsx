import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { fetchDrafts, formatOnset } from '@/lib/cases';
import { requireAccessToken } from '@/lib/session';

/**
 * The member's unfinished and sent-back cases (gap G-8).
 *
 * Nothing on this screen is visible to anyone else — not to other members, and not to
 * moderators, who cannot see a case discussion before it is published (EPIC-E §12,
 * resolved 2026-07-17). It is deliberately the *only* place a draft surfaces: drafts stay
 * out of Discussions and out of "My questions and answers", both of which answer "what
 * have I contributed", which an unpublished case has not yet done.
 */
export default async function DraftsPage() {
  const token = await requireAccessToken();
  const [t, format, drafts] = await Promise.all([
    getTranslations('drafts'),
    getFormatter(),
    fetchDrafts(token),
  ]);

  // No <main> or <h1> here — the Activity layout supplies both, and this is one of its panes.
  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
        {t('private')}
      </p>

      {drafts.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('empty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {drafts.map((draft) => (
            <li key={draft.id}>
              <Link
                href={`/create/case/${draft.id}`}
                className="flex flex-col gap-2 border px-3 py-3"
                style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 text-xs font-medium"
                    style={{
                      borderRadius: 'var(--radius-pill)',
                      background:
                        draft.status === 'needs_correction'
                          ? 'var(--color-bad)'
                          : 'var(--color-navy-tint)',
                      color:
                        draft.status === 'needs_correction'
                          ? 'var(--color-surface)'
                          : 'var(--color-fg)',
                    }}
                  >
                    {t(`status.${draft.status}`)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    {draft.category.name}
                  </span>
                </div>

                <span className="text-sm font-medium">{draft.title}</span>

                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {t('meta', {
                    age: t(`ageBand.${draft.ageBand}`),
                    onset: formatOnset(draft.onsetDays),
                  })}
                </span>

                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {draft.checklistRemaining === 0
                    ? t('checklistDone')
                    : t('checklistRemaining', {
                        remaining: draft.checklistRemaining,
                        total: draft.checklistTotal,
                      })}
                  {' · '}
                  {format.relativeTime(new Date(draft.editedAt ?? draft.createdAt))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

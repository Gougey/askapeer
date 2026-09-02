import Link from 'next/link';
import { fetchFeedCoverage, fetchFeedStatus, requireAdmin } from '@/lib/admin';
import { Table } from '../ui';
import { ReclassifyButton } from './ReclassifyButton';

/**
 * G-? — the research feed's own admin surface.
 *
 * Two jobs the console could not do at all before. **Reclassify** was reachable only by
 * minting an admin token by hand, so improving the vocabulary and updating the feed to
 * reflect it were separate skills. And **coverage** answers the question the tag work has
 * been running blind on: which tags never match anything, ordered by who is waiting.
 */
export const dynamic = 'force-dynamic';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'bad' | 'ok' }) {
  const colour =
    tone === 'bad' ? 'var(--color-bad)' : tone === 'ok' ? 'var(--color-ok)' : 'var(--color-fg)';
  return (
    <div
      className="flex flex-col gap-1 rounded-2xl border p-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <span className="text-2xl font-semibold tabular-nums" style={{ color: colour }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
        {label}
      </span>
    </div>
  );
}

export default async function ResearchFeedAdminPage() {
  const token = await requireAdmin();
  const [status, coverage] = await Promise.all([
    fetchFeedStatus(token),
    fetchFeedCoverage(token),
  ]);

  const untaggedPct = status.articles
    ? Math.round((coverage.untagged / status.articles) * 100)
    : 0;
  const waiting = coverage.silentTags.filter((t) => t.interested > 0);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">The corpus</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Articles stored" value={status.articles.toLocaleString()} />
          <Stat label="Carrying at least one tag" value={status.classified.toLocaleString()} />
          <Stat
            label={`Untagged (${untaggedPct}%)`}
            value={coverage.untagged.toLocaleString()}
            tone={untaggedPct > 25 ? 'bad' : undefined}
          />
          <Stat
            label="Matches on retired tags"
            value={coverage.staleMatches.toLocaleString()}
            tone={coverage.staleMatches > 0 ? 'bad' : 'ok'}
          />
        </div>
        {coverage.staleMatches > 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-bad)' }}>
            Retired tags are still collecting matches. Classification should skip them — run a
            reclassify to clear these, and if the number comes back, the classifier is reading
            retired tags again.
          </p>
        ) : null}
        <ReclassifyButton />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Ingest sources</h2>
        <Table head={['Source', 'Last run', 'Seen', 'Stored', 'Last error']}>
          {status.cursors.map((c) => (
            <tr key={c.sourceName} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              <td className="px-2 py-2 font-medium">{c.sourceName}</td>
              <td className="px-2 py-2" style={{ color: 'var(--color-muted)' }}>
                {c.lastRunAt ? new Date(c.lastRunAt).toLocaleString('en-GB') : 'never'}
              </td>
              <td className="px-2 py-2 tabular-nums">{c.articlesSeen.toLocaleString()}</td>
              <td className="px-2 py-2 tabular-nums">{c.articlesStored.toLocaleString()}</td>
              <td className="px-2 py-2" style={{ color: c.lastError ? 'var(--color-bad)' : 'var(--color-muted)' }}>
                {c.lastError ?? '—'}
              </td>
            </tr>
          ))}
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Tags that never match</h2>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {coverage.silent.toLocaleString()} of {coverage.tags.toLocaleString()} tags have never
            matched an article; {coverage.matched.toLocaleString()} have.{' '}
            {waiting.length > 0 ? (
              <>
                <strong style={{ color: 'var(--color-fg)' }}>
                  {waiting.length} of them are somebody&rsquo;s chosen interest
                </strong>{' '}
                and return that member nothing — those are listed first, and are the ones worth a
                synonym today.
              </>
            ) : (
              <>None of them is a chosen interest, so nothing here is failing a member right now.</>
            )}
          </p>
        </div>
        <Table head={['Tag', 'Region', 'Members waiting', '']}>
          {coverage.silentTags.slice(0, 100).map((t) => (
            <tr key={t.id} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              <td className="px-2 py-2 font-medium">{t.name}</td>
              <td className="px-2 py-2" style={{ color: 'var(--color-muted)' }}>
                {t.region}
              </td>
              <td
                className="px-2 py-2 tabular-nums"
                style={{ color: t.interested > 0 ? 'var(--color-bad)' : 'var(--color-muted)' }}
              >
                {t.interested > 0 ? t.interested : '—'}
              </td>
              <td className="px-2 py-2">
                <Link href={`/admin/config/tags/${t.id}`} className="text-sm underline">
                  Add synonyms
                </Link>
              </td>
            </tr>
          ))}
        </Table>
        {coverage.silentTags.length > 100 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Showing the first 100 of {coverage.silentTags.length.toLocaleString()}. The tail is
            mostly individual muscles and ligaments the literature rarely names on its own.
          </p>
        ) : null}
      </section>
    </div>
  );
}

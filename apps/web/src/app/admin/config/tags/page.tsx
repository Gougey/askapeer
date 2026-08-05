import Link from 'next/link';
import { fetchAdminTags, requireAdmin } from '@/lib/admin';
import { Table } from '../../ui';

/**
 * G8 — the tag vocabulary. Phase one: browse, search, and edit synonyms.
 *
 * Search leads rather than a tree, because the job that brings an administrator here is
 * "what does the vocabulary do with *this word*" — Andrew arrives holding a term like
 * "quadriceps" and needs to see every tag it touches, wherever they sit. It matches
 * synonyms as well as names, which is also how he checks his own work: having put a word on
 * eight scattered tags, searching it must find all eight.
 *
 * Article and post counts are on every row because they are the honest measure of whether a
 * tag is doing anything. A tag with 588 siblings and no content behind it is the thing
 * worth finding.
 */
export default async function TagAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const token = await requireAdmin();
  const tags = await fetchAdminTags(token, q);

  return (
    <div className="flex flex-col gap-3">
      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search names and synonyms, e.g. quadriceps"
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-muted)', background: 'var(--color-surface)', fontSize: '16px' }}
        />
        <button type="submit" className="rounded-lg px-3 py-2 text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>
          Search
        </button>
      </form>

      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        {tags.length} tag{tags.length === 1 ? '' : 's'}
        {q ? ` matching “${q}”` : ' in the vocabulary'} · articles = research feed, posts = forum
      </p>

      <Table head={['Tag', 'Parent', 'Region', 'Synonyms', 'Articles', 'Posts']}>
        {tags.map((tag) => (
          <tr key={tag.id} className="align-top">
            <td className="border-b px-2 py-2" style={{ borderColor: 'var(--color-border)' }}>
              <Link href={`/admin/config/tags/${tag.id}`} className="underline" style={{ color: 'var(--color-accent)' }}>
                {tag.name}
              </Link>
              {tag.retired && <span className="ml-1 text-xs" style={{ color: 'var(--color-warn)' }}>retired</span>}
            </td>
            <td className="border-b px-2 py-2 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
              {tag.parentName ?? '—'}
            </td>
            <td className="border-b px-2 py-2 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
              {tag.region}
            </td>
            <td className="border-b px-2 py-2 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
              {tag.synonyms.length > 0 ? tag.synonyms.join(', ') : '—'}
            </td>
            <td className="border-b px-2 py-2 tabular-nums" style={{ borderColor: 'var(--color-border)' }}>
              {tag.articleCount}
            </td>
            <td className="border-b px-2 py-2 tabular-nums" style={{ borderColor: 'var(--color-border)' }}>
              {tag.postCount}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

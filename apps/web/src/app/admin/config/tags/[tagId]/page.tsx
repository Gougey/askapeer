import Link from 'next/link';
import { fetchAdminTag, requireAdmin } from '@/lib/admin';
import { StructureEditor } from './StructureEditor';
import { SynonymEditor } from './SynonymEditor';

/** One tag: where it sits, what it carries, and its synonyms (EPIC-J, screen G8). */
export default async function TagDetailPage({ params }: { params: Promise<{ tagId: string }> }) {
  const { tagId } = await params;
  const token = await requireAdmin();
  const tag = await fetchAdminTag(token, tagId);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/config/tags" className="text-sm underline" style={{ color: 'var(--color-muted)' }}>
        ← All tags
      </Link>

      <div>
        <h1 className="text-lg font-semibold">{tag.name}</h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {tag.facet} · under {tag.parentName ?? 'no parent'} · region {tag.region} ·{' '}
          {tag.articleCount} article{tag.articleCount === 1 ? '' : 's'} · {tag.postCount} post
          {tag.postCount === 1 ? '' : 's'}
        </p>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-faint)' }}>id {tag.id}</p>

      <SynonymEditor tag={tag} />
      <StructureEditor tag={tag} />
    </div>
  );
}

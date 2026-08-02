import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/**
 * The "there is more below this" control, shared by every cursor-paginated list.
 *
 * Each list API has returned a `nextCursor` since S4; no screen read it. With 13 seeded
 * posts nobody noticed, and the moment the corpus reached 65 the Discussions list was
 * showing 20 and silently hiding 45 — content members had written that nobody could reach.
 *
 * **URL-driven, not accumulate-on-click.** The cursor goes in the query string, so a page
 * of results is addressable, survives a reload, and works with no JavaScript. Appending
 * would need the cards re-implemented as client components — `PostCard` and the activity
 * rows are async server components — and a second copy of a card is exactly the drift the
 * shared tag picker exists to avoid.
 *
 * The trade is that "more" replaces rather than extends. That is only tolerable because
 * the app bar's back control restores both the previous page *and its scroll position*
 * (verified: 0px drift), so paging forward is reversible rather than a one-way door.
 */
export async function LoadMore({
  href,
  labelKey = 'more',
}: {
  href: string;
  /** Key under `pagination` — lists say slightly different things ("Older", "More"). */
  labelKey?: 'more' | 'older';
}) {
  const t = await getTranslations('pagination');
  return (
    <Link
      href={href}
      className="w-full border px-3 py-2 text-center text-sm font-medium"
      style={{
        borderColor: 'var(--color-border-strong)',
        borderRadius: 'var(--radius)',
        color: 'var(--color-accent)',
      }}
    >
      {t(labelKey)}
    </Link>
  );
}

/**
 * Shown when a list is displaying anything other than its first page.
 *
 * The app bar's back control is hidden on the four tab destinations, and paging does not
 * change the pathname — so on `/discussions?cursor=…` there is no back chevron, and
 * without this the only way to the top of the list is the nav tab. That works, but it
 * reads as a reset rather than a return.
 */
export async function BackToStart({ href }: { href: string }) {
  const t = await getTranslations('pagination');
  return (
    <Link
      href={href}
      className="self-start text-sm font-semibold"
      style={{ color: 'var(--color-accent)' }}
    >
      {t('newest')}
    </Link>
  );
}

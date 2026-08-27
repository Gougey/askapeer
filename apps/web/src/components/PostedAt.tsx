import { getFormatter, getTranslations } from 'next-intl/server';

/** Under a week, "3 days ago" reads better than a date. Past it, the date is what matters. */
const RELATIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * When something was posted — the one place that decides how a date is written.
 *
 * There were three conventions before this: the feed printed an absolute date, threads
 * printed relative time, and the list and every answer printed nothing at all, with five
 * call sites each formatting for themselves. Screen spec C1 and style guide §8.3 both put
 * a timestamp on the discussion card; it had simply never been built.
 *
 * **Date granularity, never a clock time — this is an anonymity rule, not a style choice.**
 * EPIC-B already establishes that a precise date is a correlation vector, which is why a
 * profile says "Member since 2026" while storing the full date. A posting *time* is the
 * stronger version of the same signal: consistently posting at 02:00 says you work nights,
 * and on a network where the handle is the only identity, that is exactly the inference the
 * pseudonymity model exists to deny. So the `dateTime` attribute carries the date alone —
 * a full ISO timestamp there would publish in the markup precisely what the label withholds.
 *
 * ⚠️ The API still returns full `createdAt` timestamps, so the time of day remains visible
 * to anyone reading the network response. Closing that means trimming the DTO, which is a
 * decision beyond this component.
 */
export async function PostedAt({
  iso,
  editedIso = null,
  className = 'text-xs',
}: {
  iso: string;
  /** Present when the content has been edited; shown as a marker, never as a second date. */
  editedIso?: string | null;
  className?: string;
}) {
  const [format, t] = await Promise.all([getFormatter(), getTranslations('discussions')]);
  const date = new Date(iso);
  const absolute = format.dateTime(date, { day: 'numeric', month: 'short', year: 'numeric' });
  const label = Date.now() - date.getTime() < RELATIVE_WINDOW_MS ? format.relativeTime(date) : absolute;

  return (
    <span className={className} style={{ color: 'var(--color-muted)' }}>
      {/* `title` gives the exact date to a mouse, `dateTime` to a screen reader and to
          anything parsing the page — both the date only, for the reason above. */}
      <time dateTime={date.toISOString().slice(0, 10)} title={absolute}>
        {label}
      </time>
      {editedIso && ` · ${t('edited')}`}
    </span>
  );
}

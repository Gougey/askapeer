import { getFormatter, getTranslations } from 'next-intl/server';
import type { Notification } from '@/lib/notifications';
import { openNotificationAction } from './actions';

/** §8.13 — kudos rows carry the gold star; replies carry the discussion glyph. */
const GLYPH = {
  reply:
    'M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-.9L3 21l1.9-4.5A8.4 8.4 0 0 1 3 11.5a8.5 8.5 0 0 1 9-8.4 8.5 8.5 0 0 1 9 8.4z',
  kudos: 'M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17.3 5.8 20.6l1.6-6.7L2.2 8.9l6.9-.6z',
  status: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 5h2v6h-2zm0 8h2v2h-2z',
} as const;

/** Where the row leads, and how it is dressed. */
function present(n: Notification) {
  if (n.type === 'kudos_received') {
    return {
      href: `/discussions/${n.payload.postId}`,
      glyph: GLYPH.kudos,
      // Kudos gold is the product's one status colour and this is a kudos event — the
      // single place outside the kudos control itself where it is correct to use it.
      tint: 'var(--color-kudos-tint)',
      ink: 'var(--color-kudos)',
      filled: true,
    };
  }
  if (n.type === 'reply') {
    return {
      href: `/discussions/${n.payload.postId}`,
      glyph: GLYPH.reply,
      tint: 'var(--color-navy-tint)',
      ink: 'var(--color-accent)',
      filled: false,
    };
  }
  return {
    href: '/status',
    glyph: GLYPH.status,
    tint: 'var(--color-verify-tint)',
    ink: 'var(--color-verify-text)',
    filled: true,
  };
}

/**
 * One row of the inbox (screen E1, style guide §8.13): circular tinted icon, text with
 * the handle in 700, timestamp. An unread row takes a navy-tint background.
 *
 * The whole row is a form submit, not a link, because opening a notification has to mark
 * it read as well as navigate — and doing that in a server action means it still works
 * with JavaScript off, and the read commits before the navigation rather than racing it.
 */
export async function NotificationRow({ notification }: { notification: Notification }) {
  const t = await getTranslations('activity.rows');
  const format = await getFormatter();
  const { href, glyph, tint, ink, filled } = present(notification);
  const unread = notification.readAt === null;

  return (
    <li>
      <form action={openNotificationAction.bind(null, notification.id, href)}>
        <button
          type="submit"
          className="flex w-full items-start text-left"
          style={{
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-medium)',
            background: unread ? 'var(--color-navy-tint)' : 'transparent',
          }}
        >
          <span
            aria-hidden
            className="flex shrink-0 items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-pill)',
              background: tint,
              color: ink,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-[18px]"
              fill={filled ? 'currentColor' : 'none'}
              stroke={filled ? 'none' : 'currentColor'}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={glyph} />
            </svg>
          </span>

          <span className="flex min-w-0 flex-1 flex-col" style={{ gap: 2 }}>
            <span className="text-sm">
              {notification.type === 'reply' && (
                <>
                  <span className="font-bold">{notification.payload.actorHandleName}</span>{' '}
                  {t('replied')}
                </>
              )}
              {notification.type === 'kudos_received' &&
                t(notification.payload.targetType === 'post' ? 'kudosOnPost' : 'kudosOnComment')}
              {notification.type === 'verification_status_change' && t('statusChanged')}
            </span>

            {notification.type !== 'verification_status_change' && (
              <span className="truncate text-sm" style={{ color: 'var(--color-muted)' }}>
                {notification.payload.postTitle}
              </span>
            )}

            <span className="text-xs" style={{ color: 'var(--color-faint)' }}>
              {format.relativeTime(new Date(notification.createdAt))}
            </span>
          </span>

          {/* §8.7 — the unread dot. Colour alone can never carry meaning (§9.2), so the
              state is also announced in text for anyone not seeing the dot. */}
          {unread && (
            <>
              <span
                aria-hidden
                className="mt-1.5 shrink-0"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-danger)',
                }}
              />
              <span className="sr-only">{t('unread')}</span>
            </>
          )}
        </button>
      </form>
    </li>
  );
}

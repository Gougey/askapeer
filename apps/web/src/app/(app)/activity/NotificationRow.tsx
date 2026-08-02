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

/**
 * Where the row leads, and how it is dressed. A null `href` means the row has nowhere
 * useful to go and only marks itself read.
 */
function present(n: Notification): {
  href: string | null;
  glyph: string;
  tint: string;
  ink: string;
  filled: boolean;
} {
  if (n.type === 'kudos_received') {
    return {
      /*
       * Kudos goes nowhere, deliberately.
       *
       * Opening the thread was the obvious default and the wrong one: kudos is
       * pseudonymous by design, so there is no actor to go and look at, and the row
       * already names the post below. Everything the notification has to say fits in the
       * row, so navigating away from the inbox costs a member their place in it and
       * returns nothing. Tapping marks it read, which is the only thing left to do with it.
       */
      href: null,
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
  // An account-status notice. A verification decision belongs on the holding page, which
  // is what explains a verification state; a moderation notice opens its own detail screen
  // (E4), added later — so the comment that used to sit here saying no such screen existed
  // was describing a world that no longer holds.
  const moderation = n.payload.event !== 'verification';
  const severe = n.payload.event === 'suspended' || n.payload.event === 'expelled';
  return {
    // A moderation notice opens the action behind it — what was reported, under what
    // category, and what the moderator decided. Without that a warning tells a member
    // they did something wrong but not what, which is not much of a warning. Notices
    // written before the payload carried an actionId have nowhere to go, so they stay put.
    href: moderation
      ? n.payload.actionId
        ? `/activity/notices/${n.payload.actionId}`
        : null
      : '/status',
    glyph: GLYPH.status,
    tint: moderation ? 'var(--color-navy-tint)' : 'var(--color-verify-tint)',
    // Severity is carried by the words (§9.2); the icon only reinforces it.
    ink: severe ? 'var(--color-danger)' : moderation ? 'var(--color-accent)' : 'var(--color-verify-text)',
    filled: true,
  };
}

/** Which line of copy an account notice gets — the `event` discriminator exists for
 *  exactly this, and matches what the email for the same event says. */
const NOTICE_KEY = {
  warned: 'warned',
  content_removed: 'contentRemoved',
  correction_requested: 'correctionRequested',
  suspended: 'suspended',
  expelled: 'expelled',
  handle_renamed: 'handleRenamed',
  verification: 'statusChanged',
} as const;

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
              {notification.type === 'verification_status_change' &&
                t(NOTICE_KEY[notification.payload.event] ?? 'statusChanged', {
                  handle: notification.payload.newHandleName ?? '',
                })}
            </span>

            {notification.type !== 'verification_status_change' && (
              <span className="truncate text-sm" style={{ color: 'var(--color-muted)' }}>
                {notification.payload.postTitle}
              </span>
            )}

            {/* The moderator's reason. Not truncated: this is the substance of the
                notice, and a member told they were actioned without being told why has
                not really been told. */}
            {notification.type === 'verification_status_change' && notification.payload.reason && (
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                {t('reason', { reason: notification.payload.reason })}
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

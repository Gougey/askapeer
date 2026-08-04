import type { OutboundEmail } from './email-provider';

/**
 * Every email the platform sends.
 *
 * Three rules govern all of them, and they are the reason copy lives here rather than
 * beside each caller:
 *
 * 1. **Address by handle, never by name.** `NotificationService` reads one column from
 *    the identity schema — `email` — through `identity.member_emails` precisely so that
 *    `legal_name` is not available to write into a template (EPIC-G §3). Pre-handle mail
 *    (a verification decision before a handle exists) is addressed impersonally rather
 *    than by name.
 * 2. **Never quote member-authored content.** An email lands outside the platform, in an
 *    inbox that may be read on a lock screen or a shared machine. A reply's text, and
 *    above all a case discussion's, does not travel. The email says what happened and
 *    links back; the content stays behind the login.
 * 3. **Engagement mail says how to stop it; account mail does not offer.** Replies and
 *    kudos carry a link to notification settings. Verification and moderation outcomes
 *    do not, because that channel cannot be switched off (EPIC-G §6.1) and pretending
 *    otherwise would be a lie in the footer.
 *
 * These are plain English for now. When a second locale lands, this is the file that
 * grows a catalogue — the API has no i18n mechanism yet, and inventing one here ahead of
 * a real second language would be guesswork.
 */

type Ctx = {
  /** Absolute base URL of the web app, e.g. https://askapeer-web.fly.dev */
  webOrigin: string;
  /**
   * The address replies reach, or null when none is configured.
   *
   * Named in the copy rather than left to the `Reply-To` header alone: the plain-text part
   * is what some clients render and what a forwarded message keeps, and "reply to this
   * email" is worthless in either if the header did not survive. When it is null the
   * invitation is omitted entirely — promising an appeal route that discards replies is
   * worse than offering none.
   */
  replyTo: string | null;
};

const SIGN_OFF = 'AskaPeer — the no-ego sports medicine network';

/** Wraps a body in the shared frame. `settingsLink` is omitted for account-critical mail. */
function frame(
  ctx: Ctx,
  parts: { heading: string; lines: string[]; cta?: { label: string; path: string }; settingsLink: boolean },
): { text: string; html: string } {
  const url = parts.cta ? `${ctx.webOrigin}${parts.cta.path}` : null;
  const footer = parts.settingsLink
    ? `Choose which emails you receive: ${ctx.webOrigin}/settings/notifications`
    : 'This is a notice about your account, so it is sent regardless of your notification settings.';

  const text = [
    parts.heading,
    '',
    ...parts.lines,
    ...(url ? ['', url] : []),
    '',
    '—',
    footer,
    SIGN_OFF,
  ].join('\n');

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const html = [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#14212b;max-width:480px">',
    `<h1 style="font-size:18px;margin:0 0 12px">${esc(parts.heading)}</h1>`,
    ...parts.lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`),
    url
      ? `<p style="margin:20px 0"><a href="${esc(url)}" style="background:#001f52;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:999px;display:inline-block">${esc(parts.cta!.label)}</a></p>`
      : '',
    `<hr style="border:none;border-top:1px solid #e5ebee;margin:24px 0">`,
    `<p style="font-size:12px;color:#64757f;margin:0 0 4px">${esc(footer)}</p>`,
    `<p style="font-size:12px;color:#64757f;margin:0">${esc(SIGN_OFF)}</p>`,
    '</div>',
  ].join('');

  return { text, html };
}

export const templates = {
  /**
   * The sign-in email. The one that must work before anything else does — since the dev
   * bypass was removed it is the only route into the platform, for everyone.
   */
  magicLink(ctx: Ctx, token: string, code?: string): Omit<OutboundEmail, 'to'> {
    /*
     * The code is not a fallback for a broken link — it is the only route into an
     * *installed* app on iOS, where tapping the link opens the default browser and the
     * home-screen app keeps a separate storage container. So it is stated plainly and
     * early rather than buried as a footnote for when something goes wrong.
     */
    const codeLines = code
      ? [
          `Or enter this code in the app: ${code}`,
          'Use the code if you opened Askapeer from your home screen — the link signs you in to your browser instead.',
        ]
      : [];
    const body = frame(ctx, {
      heading: 'Your AskaPeer sign-in link',
      lines: [
        'Use the button below to sign in. The link works once and expires shortly.',
        ...codeLines,
        'If you did not ask to sign in, you can ignore this email — nothing has changed.',
      ],
      cta: { label: 'Sign in', path: `/auth/verify?token=${encodeURIComponent(token)}` },
      settingsLink: false,
    });
    return { subject: 'Your AskaPeer sign-in link', ...body };
  },

  /** Pre-handle verification outcome (EPIC-G §4) — no handle exists yet, so no name and
   *  no in-app equivalent. */
  verificationStatus(ctx: Ctx, status: string, reason: string | null): Omit<OutboundEmail, 'to'> {
    const lines: Record<string, string[]> = {
      approved_verified: [
        'Your professional registration has been verified. You can now choose a handle and join the community.',
      ],
      needs_more_info: [
        'We need a little more information before we can verify your registration.',
        ...(reason ? [reason] : []),
        'Open AskaPeer to continue.',
      ],
      rejected: [
        'We were not able to verify your professional registration, so your application has not been approved.',
        ...(reason ? [reason] : []),
      ],
    };
    return {
      subject: 'Your AskaPeer verification',
      ...frame(ctx, {
        heading: 'Your AskaPeer verification',
        lines: lines[status] ?? ['Your verification status has changed.'],
        cta: status === 'rejected' ? undefined : { label: 'Open AskaPeer', path: '/status' },
        settingsLink: false,
      }),
    };
  },

  reply(ctx: Ctx, actorHandleName: string, postTitle: string, postId: string): Omit<OutboundEmail, 'to'> {
    return {
      subject: `${actorHandleName} replied to you on AskaPeer`,
      // The reply's text is deliberately absent — see rule 2 above.
      ...frame(ctx, {
        heading: `${actorHandleName} replied to you`,
        lines: [`On “${postTitle}”.`],
        cta: { label: 'Read the reply', path: `/discussions/${postId}` },
        settingsLink: true,
      }),
    };
  },

  kudosReceived(
    ctx: Ctx,
    targetType: 'post' | 'comment',
    postTitle: string,
    postId: string,
  ): Omit<OutboundEmail, 'to'> {
    return {
      subject: 'You received kudos on AskaPeer',
      ...frame(ctx, {
        heading: 'You received kudos',
        // Who gave it is not named, here or anywhere else in the product.
        lines: [`Your ${targetType === 'post' ? 'question' : 'answer'} on “${postTitle}” received kudos.`],
        cta: { label: 'Open the thread', path: `/discussions/${postId}` },
        settingsLink: true,
      }),
    };
  },

  /**
   * A moderation outcome or a post-handle verification change.
   *
   * This is the email that carries the most weight: a suspended or expelled member cannot
   * open the app at all, so for them this is not a copy of an in-app notice — it is the
   * only thing they will ever receive. It says what happened and why, and does not offer
   * to stop sending.
   */
  accountNotice(
    ctx: Ctx,
    event: string,
    reason: string | null,
    extra: { newHandleName?: string; actionId?: string; status?: string },
  ): Omit<OutboundEmail, 'to'> {
    const because = reason ? [`Reason given: ${reason}`] : [];
    // Only offered when something can actually receive it.
    const appeal = ctx.replyTo
      ? [`If you believe this is a mistake, reply to this email — it reaches ${ctx.replyTo}.`]
      : [];
    const openNotice = extra.actionId
      ? { label: 'See the details', path: `/activity/notices/${extra.actionId}` }
      : undefined;

    const byEvent: Record<string, { subject: string; heading: string; lines: string[]; cta?: { label: string; path: string } }> = {
      warned: {
        subject: 'A moderator has issued a warning',
        heading: 'A moderator has issued you a warning',
        lines: ['A formal warning has been recorded against your handle. Your access is unchanged.', ...because],
        cta: openNotice,
      },
      content_removed: {
        subject: 'A moderator removed your content',
        heading: 'A moderator removed your content',
        lines: ['One of your contributions has been removed from the community.', ...because],
        cta: openNotice,
      },
      suspended: {
        subject: 'Your AskaPeer access has been suspended',
        heading: 'Your access has been suspended',
        lines: [
          'Your handle has been suspended, and you will not be able to use the community while it is.',
          ...because,
          ...appeal,
        ],
      },
      expelled: {
        subject: 'Your AskaPeer membership has ended',
        heading: 'Your membership has ended',
        lines: [
          'Your handle has been permanently removed from AskaPeer.',
          ...because,
          ...appeal,
        ],
      },
      correction_requested: {
        subject: 'Your case discussion needs a correction',
        heading: 'Your case discussion needs a correction',
        lines: [
          'A moderator has asked you to correct one of your case discussions. It is hidden from other members until you republish it — the answers and kudos it received are unaffected and will come back with it.',
          ...because,
          'Open it, make the change, confirm the de-identification checklist again, and post it.',
        ],
        // Deliberately the notice rather than the composer: the member needs to read what
        // was wrong before they are dropped into editing it. The notice links onward.
        cta: openNotice,
      },
      handle_renamed: {
        subject: 'Your handle has been changed',
        heading: 'Your handle has been changed',
        lines: [
          `A moderator has changed your handle to ${extra.newHandleName ?? 'a new name'}. Your contributions are unchanged.`,
          ...because,
        ],
        cta: openNotice,
      },
    };

    const chosen = byEvent[event] ?? {
      subject: 'Your AskaPeer account status has changed',
      heading: 'Your account status has changed',
      lines: [`Your account status is now ${extra.status ?? 'updated'}.`, ...because],
      cta: { label: 'Open AskaPeer', path: '/status' },
    };

    return {
      subject: chosen.subject,
      ...frame(ctx, {
        heading: chosen.heading,
        lines: chosen.lines,
        cta: chosen.cta,
        settingsLink: false,
      }),
    };
  },
};

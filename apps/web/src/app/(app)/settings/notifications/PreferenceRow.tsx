'use client';

import { useState, useTransition } from 'react';
import type { NotificationPreference } from '@/lib/notifications';
import { setNotificationPreferenceAction } from '../actions';

type Channel = 'inApp' | 'email' | 'push';

/**
 * A single channel switch. `role="switch"` rather than a checkbox because that is what
 * this is — an on/off control with an immediate effect, not a form field awaiting submit
 * — and it gives assistive tech the on/off state directly.
 *
 * §9.2: state is never colour alone. The knob moves, and `aria-checked` carries it.
 */
function Switch({
  on,
  disabled,
  label,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      // 44×44 minimum target (§8.1) even though the switch itself is smaller.
      className="flex size-11 items-center justify-center"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}
    >
      <span
        aria-hidden
        className="flex items-center"
        style={{
          width: 34,
          height: 20,
          padding: 2,
          borderRadius: 'var(--radius-pill)',
          background: on ? 'var(--color-accent)' : 'var(--color-border-strong)',
          justifyContent: on ? 'flex-end' : 'flex-start',
          transition: 'background 140ms ease',
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--color-surface)',
            boxShadow: 'var(--shadow-card)',
          }}
        />
      </span>
    </button>
  );
}

/**
 * One notification type's row of the matrix (screen F4).
 *
 * State is local and optimistic so a toggle responds immediately; the server action
 * revalidates behind it. If the save fails the local value is rolled back rather than
 * left showing something the server does not believe.
 */
export function PreferenceRow({
  preference,
  label,
  channelLabels,
  pushAvailable,
}: {
  preference: NotificationPreference;
  label: string;
  channelLabels: Record<Channel, string>;
  pushAvailable: boolean;
}) {
  const [value, setValue] = useState(preference);
  const [, startTransition] = useTransition();

  const toggle = (channel: Channel) => {
    const next = { ...value, [channel]: !value[channel] };
    const previous = value;
    setValue(next);
    startTransition(async () => {
      try {
        await setNotificationPreferenceAction({
          type: next.type,
          inApp: next.inApp,
          email: next.email,
          push: next.push,
        });
      } catch {
        setValue(previous);
      }
    });
  };

  return (
    <tr>
      <th scope="row" className="py-2 pr-2 text-left text-sm font-normal">
        {label}
      </th>
      <td className="text-center">
        <Switch
          on={value.inApp}
          label={`${channelLabels.inApp} — ${label}`}
          onToggle={() => toggle('inApp')}
        />
      </td>
      <td className="text-center">
        <Switch
          on={value.email}
          // The one channel that cannot be switched off (§6.1): an account-status change
          // is not engagement content to opt out of.
          disabled={preference.emailLocked}
          label={`${channelLabels.email} — ${label}`}
          onToggle={() => toggle('email')}
        />
      </td>
      <td className="text-center">
        <Switch
          on={value.push}
          disabled={!pushAvailable}
          label={`${channelLabels.push} — ${label}`}
          onToggle={() => toggle('push')}
        />
      </td>
    </tr>
  );
}

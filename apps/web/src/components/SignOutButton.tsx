import { signOutAction } from '@/app/actions';

/** Sign-out as a form POST — see signOutAction for why this must not be a link. */
export function SignOutButton({ label }: { label: string }) {
  return (
    <form action={signOutAction}>
      <button type="submit" className="text-sm underline" style={{ color: 'var(--color-muted)' }}>
        {label}
      </button>
    </form>
  );
}

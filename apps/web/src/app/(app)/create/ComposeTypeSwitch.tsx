import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/**
 * Question ⇄ case discussion (the mockup's segmented control).
 *
 * Two routes rather than one screen toggling client-side, because they are genuinely two
 * different acts: a question publishes on submit, a case discussion travels a gated
 * checklist-and-attestation route it cannot leave. A switch that swapped the fields under
 * a member mid-compose would imply the two are the same thing with extra boxes.
 */
export async function ComposeTypeSwitch({ active }: { active: 'question' | 'case' }) {
  const t = await getTranslations('compose');

  const base = 'flex-1 px-3 py-2 text-sm font-medium text-center';
  const on = { background: 'var(--color-accent)', color: 'var(--color-surface)' };
  const off = { color: 'var(--color-muted)' };

  return (
    <div
      className="flex overflow-hidden border"
      style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
      role="group"
      aria-label={t('typeSwitch.label')}
    >
      <Link
        href="/create"
        className={base}
        style={active === 'question' ? on : off}
        aria-current={active === 'question' ? 'page' : undefined}
      >
        {t('typeSwitch.question')}
      </Link>
      <Link
        href="/create/case"
        className={base}
        style={active === 'case' ? on : off}
        aria-current={active === 'case' ? 'page' : undefined}
      >
        {t('typeSwitch.case')}
      </Link>
    </div>
  );
}

import { getTranslations } from 'next-intl/server';
import { SegmentedControl } from '@/components/SegmentedControl';

/**
 * Question ⇄ case discussion (the mockup's segmented control).
 *
 * Two routes rather than one screen toggling client-side, because they are genuinely two
 * different acts: a question publishes on submit, a case discussion travels a gated
 * checklist-and-attestation route it cannot leave. A switch that swapped the fields under
 * a member mid-compose would imply the two are the same thing with extra boxes.
 *
 * The markup used to live here, which is how the app ended up with two segmented-control
 * treatments for one idea (§8.9 always specified a single control for both this and the
 * in-pane toggles). This look won; it now comes from the shared component.
 */
export async function ComposeTypeSwitch({ active }: { active: 'question' | 'case' }) {
  const t = await getTranslations('compose');

  return (
    <SegmentedControl
      label={t('typeSwitch.label')}
      segments={[
        { href: '/create', label: t('typeSwitch.question'), active: active === 'question' },
        { href: '/create/case', label: t('typeSwitch.case'), active: active === 'case' },
      ]}
    />
  );
}

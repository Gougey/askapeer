import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { BrandLockup } from '@/components/Brand';

/**
 * The welcome guide for the closed pilot (October 2026) — what Andrew's invitation email links to.
 *
 * ⚠️ **Public, and outside `(app)`, on purpose.** The people reading it have no account yet, so it
 * must render signed out; it sits beside the sign-in page rather than inside the gated layout.
 * Nothing here is member data: the screenshots are of the seeded demo corpus, taken locally
 * (`docs/tools/welcome-screenshots/`), so no real member's post can ever appear in them.
 *
 * Not indexed. It describes a pilot that is invitation-only, and a search engine sending
 * strangers to a registration form that will refuse them helps nobody.
 */
export const metadata: Metadata = {
  title: 'Welcome to Askapeer',
  robots: { index: false, follow: false },
};

/** Screenshots are 390×844 phone captures at 2×. */
const SHOT = { width: 780, height: 1688 };

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="flex flex-col items-center" style={{ gap: 'var(--space-2)' }}>
      <Image
        src={`/guide/${src}`}
        alt={alt}
        width={SHOT.width}
        height={SHOT.height}
        className="h-auto w-[220px] border"
        style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius-large)' }}
      />
      <figcaption className="text-xs" style={{ color: 'var(--color-muted)' }}>
        {alt}
      </figcaption>
    </figure>
  );
}

function Step({
  n,
  id,
  title,
  children,
}: {
  n: number;
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col scroll-mt-4" style={{ gap: 'var(--space-3)' }}>
      <h2 className="flex items-baseline text-xl" style={{ gap: 'var(--space-2)' }}>
        <span
          aria-hidden
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-sm"
          style={{
            background: 'var(--color-navy-tint)',
            color: 'var(--color-accent)',
            borderRadius: 'var(--radius-small)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Panel({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'rule' }) {
  return (
    <div
      className="flex flex-col border text-sm"
      style={{
        gap: 'var(--space-2)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius)',
        background: 'var(--color-surface)',
        borderColor: tone === 'rule' ? 'var(--color-fg)' : 'var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}

export default async function WelcomePage() {
  const t = await getTranslations('welcome');
  const muted = { color: 'var(--color-muted)' };

  const steps = [
    { id: 'account', title: t('step1Title') },
    { id: 'sign-in', title: t('step2Title') },
    { id: 'handle', title: t('step3Title') },
    { id: 'home-screen', title: t('step4Title') },
    { id: 'around', title: t('step5Title') },
    { id: 'feedback', title: t('step6Title') },
  ];

  return (
    <main
      className="mx-auto flex max-w-xl flex-col"
      style={{ gap: 'var(--space-8)', padding: 'var(--space-6) var(--space-4) var(--space-8)' }}
    >
      <header className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
        <BrandLockup className="h-14 w-auto self-start" />
        <p className="text-xs font-semibold uppercase tracking-wider" style={muted}>
          {t('eyebrow')}
        </p>
        <h1 className="text-3xl">{t('title')}</h1>
        <p>{t('intro')}</p>
        <Panel>
          <p>{t('pilot')}</p>
        </Panel>
        <Panel>
          <h2 className="flex items-center text-base" style={{ gap: 'var(--space-2)' }}>
            <PhoneGlyph />
            {t('mobileTitle')}
          </h2>
          <p>{t('mobileBody')}</p>
        </Panel>
        {/*
          A new tab, so the guide stays open beside the app: it is read while registering, and
          following the link in place left nothing to come back to for steps 2 to 5.
        */}
        <a
          href="/register"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center self-start px-4 py-2 text-sm font-medium"
          style={{
            gap: 'var(--space-2)',
            background: 'var(--color-accent)',
            color: 'white',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          {t('start')}
          <NewTabGlyph />{' '}
          <span className="sr-only">{t('opensNewTab')}</span>
        </a>
      </header>

      <nav aria-label={t('contents')} className="flex flex-col text-sm" style={{ gap: 'var(--space-1)' }}>
        <p className="font-medium">{t('contents')}</p>
        <ol className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
          {steps.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} style={{ color: 'var(--color-accent)' }}>
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Step n={1} id="account" title={t('step1Title')}>
        <p>{t('step1Body')}</p>
        <p className="text-sm" style={muted}>
          {t('step1Reassure')}
        </p>
        <Shot src="register.png" alt={t('shotRegister')} />
      </Step>

      <Step n={2} id="sign-in" title={t('step2Title')}>
        <p>{t('step2Body')}</p>
        <Shot src="code.png" alt={t('shotCode')} />
        <Panel>
          <p>{t('step2Junk')}</p>
        </Panel>
      </Step>

      <Step n={3} id="handle" title={t('step3Title')}>
        <p>{t('step3Body')}</p>
        <Shot src="handle.png" alt={t('shotHandle')} />
        <Panel tone="rule">
          <h3 className="text-base">{t('step3RuleHeading')}</h3>
          <p>{t('step3Rule')}</p>
        </Panel>
      </Step>

      <Step n={4} id="home-screen" title={t('step4Title')}>
        <p>{t('step4Body')}</p>
        <Panel>
          <h3 className="text-base">{t('iphoneTitle')}</h3>
          <ol className="flex list-decimal flex-col pl-5" style={{ gap: 'var(--space-1)' }}>
            <li>{t('iphone1')}</li>
            <li>
              {t('iphone2')} <ShareGlyph />
            </li>
            <li>{t('iphone3')}</li>
            <li className="font-medium">{t('iphone4')}</li>
          </ol>
        </Panel>
        <Panel>
          <h3 className="text-base">{t('androidTitle')}</h3>
          <ol className="flex list-decimal flex-col pl-5" style={{ gap: 'var(--space-1)' }}>
            <li>{t('android1')}</li>
            <li>
              {t('android2')} <MenuGlyph />
            </li>
            <li>{t('android3')}</li>
          </ol>
        </Panel>
        <Panel>
          <h3 className="text-base">{t('computerTitle')}</h3>
          <p>{t('computer1')}</p>
        </Panel>
      </Step>

      <Step n={5} id="around" title={t('step5Title')}>
        <p>{t('step5Body')}</p>
        <ul className="flex list-disc flex-col pl-5" style={{ gap: 'var(--space-2)' }}>
          <li>{t('navDiscussions')}</li>
          <li>{t('navAsk')}</li>
          <li>{t('navResearch')}</li>
          <li>{t('navActivity')}</li>
          <li>{t('navProfile')}</li>
        </ul>
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-4)' }}>
          <Shot src="discussions.png" alt={t('shotDiscussions')} />
          <Shot src="thread.png" alt={t('shotThread')} />
        </div>
        <p>{t('kudos')}</p>
        <Shot src="research.png" alt={t('shotResearch')} />
        <p>{t('searchTip')}</p>
      </Step>

      <Step n={6} id="feedback" title={t('step6Title')}>
        <p>{t('step6Body')}</p>
      </Step>

      <footer className="text-xs" style={muted}>
        {t('footer')}
      </footer>
    </main>
  );
}

/** iOS's Share glyph, drawn in the style guide's line set so a reader can match it on screen. */
function ShareGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="inline h-4 w-4 align-[-2px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12M8 7l4-4 4 4M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}

/** Chrome's three-dot menu. */
function MenuGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="inline h-4 w-4 align-[-2px]" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

/** A phone outline, for the "use it on your phone" note. */
function PhoneGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

/** The usual "opens elsewhere" arrow, so the new tab is not a surprise. */
function NewTabGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

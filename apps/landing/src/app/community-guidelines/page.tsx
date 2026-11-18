import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { BRAND, RULES, SITE_URL } from '@/content/site';

const TITLE = 'Community guidelines';
const DESCRIPTION =
  'The rules every Hengout member agrees to: verified adults only, public venues only, groups of 3 to 10, respect always, private details kept private and plans that end by 9 PM.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/community-guidelines/' },
  openGraph: { url: '/community-guidelines/', title: `${TITLE} · ${BRAND}`, description: DESCRIPTION },
};

const breadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: BRAND, item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: TITLE, item: `${SITE_URL}/community-guidelines/` },
  ],
};

export default function CommunityGuidelines() {
  return (
    <main id="main" className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-16 md:pt-24 pb-24">
      <JsonLd data={breadcrumbs} />
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-secondary">
        <ol className="flex items-center gap-2">
          <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-on-surface">{TITLE}</li>
        </ol>
      </nav>
      <header className="mb-10">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight hero-title-gradient mb-3">Hengout community guidelines</h1>
        <p className="text-sm sm:text-base text-secondary max-w-2xl leading-relaxed">
          Every member agrees to these rules before their first plan. They are the same rules the app shows, and the team
          acts on reports against them.
        </p>
      </header>
      <ol data-reveal className="grid gap-3 mb-10">
        {RULES.map((r, i) => (
          <li key={r.title} className="glass-card rounded-2xl p-5 sm:p-6 flex gap-4">
            <span className="font-mono text-[11px] text-neutral-500 pt-1">0{i + 1}</span>
            <div>
              <h2 className="text-base font-semibold text-white mb-1">{r.title}</h2>
              <p className="text-sm text-secondary leading-relaxed">{r.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="space-y-3 text-sm text-secondary leading-relaxed">
        <h2 className="text-lg font-bold text-white">What happens after a report</h2>
        <p>
          A person on the Hengout team reviews every report. Two reports from two different verified members within 30
          days pause an account until it is reviewed. Blocking is silent: the person you block is not told, and you stop
          seeing each other’s plans, profiles and messages.
        </p>
        <p>
          Suspensions, bans and failed verifications can be appealed from the app. A person answers every appeal within 48
          hours.
        </p>
        <p className="text-on-surface">If you are in danger right now, call 112.</p>
        <p>
          See also the <a className="text-accent-violet hover:text-white transition-colors" href="/legal/">terms and privacy policy</a>.
        </p>
      </div>
    </main>
  );
}

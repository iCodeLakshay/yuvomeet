import type { Metadata } from 'next';
import Link from 'next/link';
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
    <main id="main" className="page">
      <JsonLd data={breadcrumbs} />
      <div className="wrap">
        <nav aria-label="Breadcrumb">
          <ol className="crumbs">
            <li><Link href="/" className="link">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{TITLE}</li>
          </ol>
        </nav>
        <div className="head">
          <h1 className="h1">Hengout community guidelines</h1>
          <p className="lead">
            Every member agrees to these rules before their first plan. They are the same rules the app shows, and the
            team acts on reports against them.
          </p>
        </div>
        <ol className="rules">
          {RULES.map((r, i) => (
            <li key={r.title}>
              <span className="rules__n">0{i + 1}</span>
              <h2>{r.title}</h2>
              <p>{r.body}</p>
            </li>
          ))}
        </ol>
        <div className="prose-block">
          <h2>What happens after a report</h2>
          <p>
            A person on the Hengout team reviews every report. Two reports from two different verified members within 30
            days pause an account until it is reviewed. Blocking is silent: the person you block is not told, and you stop
            seeing each other’s plans, profiles and messages.
          </p>
          <p>
            Suspensions, bans and failed verifications can be appealed from the app. A person answers every appeal within 48
            hours.
          </p>
          <p>If you are in danger right now, call 112.</p>
        </div>
      </div>
    </main>
  );
}

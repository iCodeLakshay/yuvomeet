import { ArrowRight, BookMarked, BookOpen, Dices, EyeOff, Flag, IdCard, LifeBuoy, LocateFixed, Mountain, Plus, Venus } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import { DiscoverScreen, JoinScreen, ResultCard, SosScreen } from '@/components/PhoneScreens';
import { Picture } from '@/components/Picture';
import { BRAND, DESCRIPTION, FAQS, KOTA_AREAS, SITE_URL, SUPPORT_EMAIL } from '@/content/site';

/*
 * Page plan (tasteskill, kind "software", consumer app; one section per screen):
 *  hero      collage: the words left, the app's Discover feed in a lit frame right, one result card loop
 *  how       how a plan comes together, beside the Join sheet
 *  moment    word-highlight statement: groups, not dates, at public venues
 *  plans     the activities, with photographs of the kinds of places plans meet
 *  safety    the safety tools, on the one light band, beside the Get help sheet
 *  kota      the first city and its areas
 *  faq       questions, answered in crawlable HTML (FAQPage JSON-LD mirrors them)
 *  close     the contact line and the footer (Footer.tsx)
 */

const ORG_ID = `${SITE_URL}/#organization`;

// Organization and WebSite only. MobileApplication needs a price and real ratings or reviews (Google's
// software-app rules) and the app has no store listing yet, so it is added with the Play listing.
// FAQPage markup earns no rich result for a site like this, so the questions are plain visible HTML.
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: BRAND,
      url: `${SITE_URL}/`,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/img/mark-512.png`, width: 512, height: 512 },
      email: SUPPORT_EMAIL,
      areaServed: { '@type': 'City', name: 'Kota', containedInPlace: { '@type': 'State', name: 'Rajasthan' } },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: BRAND,
      description: DESCRIPTION,
      inLanguage: 'en-IN',
      publisher: { '@id': ORG_ID },
    },
  ],
};

const STEPS = [
  {
    title: 'Verify your age once',
    body: 'Confirm you are 18 or older with DigiLocker or Aadhaar offline eKYC and a live selfie. Your ID number is never kept.',
  },
  {
    title: 'Join a plan or host one',
    body: 'Send a request with a short note, or join instantly when the host allows it.',
  },
  {
    title: 'Meet, check in, rate privately',
    body: 'Chat with the group before you go, check in at the venue, then say privately who showed up.',
  },
];

const TILES = [
  { name: 'chai', label: 'Chai & Cafe', body: 'Evening chai and conversation at a café the team has checked.', alt: 'A clay cup of chai on a wooden table in a warmly lit café' },
  { name: 'music', label: 'Music & Jam', body: 'Bring a guitar or a song, or come to listen.', alt: 'Three friends playing guitar and singing in a café' },
  { name: 'sports', label: 'Sports', body: 'A game of cricket in the park, or a match to watch together.', alt: 'A game of cricket in a green park' },
  { name: 'river', label: 'Walk & Talk', body: 'An easy walk with new people along a public promenade.', alt: 'A riverside promenade with benches at sunset' },
] as const;

const MORE = [
  { label: 'Study Session', icon: BookOpen },
  { label: 'Board Games', icon: Dices },
  { label: 'Book Club', icon: BookMarked },
  { label: 'Treks & Hiking', icon: Mountain },
] as const;

const SAFETY = [
  { icon: IdCard, title: 'Checks every member’s age', body: 'An ID and selfie check before anyone joins or hosts. Only the 18+ result, birth year and gender result are kept.' },
  { icon: EyeOff, title: 'Keeps your number to yourself', body: 'Phone numbers are never shown to members. Numbers, links and handles are blocked in group chats.' },
  { icon: LocateFixed, title: 'Checks you in at the venue', body: 'Check in within 150 metres of the venue. Your location is used once for that, then discarded.' },
  { icon: Venus, title: 'Runs plans for women only', body: 'Verified women can host plans that only verified women can see and join.' },
  { icon: LifeBuoy, title: 'Gets you help during a plan', body: 'Call 112, or send one location fix to a trusted contact on WhatsApp. The contact is saved only on your phone.' },
  { icon: Flag, title: 'Lets you report or block anyone', body: 'From any profile, plan or message. A person reviews reports and answers every appeal within 48 hours.' },
] as const;

export default function Home() {
  return (
    <main id="main">
      <JsonLd data={structuredData} />

      {/* Hero: tasteskill "collage" (dealt; layout-history.json) */}
      <section className="hero" data-enter aria-labelledby="hero-h">
        <div className="wrap">
          <div className="hero__text">
            <h1 className="h1" id="hero-h">Small group plans in Kota for verified adults</h1>
            <p className="lead hero__lead">
              Join a chai evening, a study session or a trek with 3 to 10 people. Plans meet at approved public venues,
              and every member passes an ID and selfie check.
            </p>
            <div className="hero__actions">
              <a className="btn btn--primary" href="#how-it-works">
                See how plans work
                <ArrowRight aria-hidden="true" />
              </a>
              <a className="btn btn--secondary" href="#safety">Read the safety rules</a>
            </div>
            <p className="hero__note">An Android app. Kota first; other cities follow.</p>
          </div>
          <div className="hero__art">
            <div className="hero__glow" aria-hidden="true">
              <Picture name="glow" alt="" sizes="(min-width: 1024px) 628px, 100vw" priority />
            </div>
            <DiscoverScreen className="hero__phone" />
            <ResultCard className="hero__card" />
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works" aria-labelledby="how-h">
        <div className="wrap split">
          <div className="split__text">
            <div className="head">
              <h2 className="h2" id="how-h">How a plan comes together</h2>
              <p className="lead">Browsing is open to everyone. Joining or hosting needs a one-time 18+ check that takes about a minute.</p>
            </div>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="steps__n">0{i + 1}</span>
                  <h3 className="card-title">{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="split__visual">
            <JoinScreen />
          </div>
        </div>
      </section>

      {/* The dealt moment: word-highlight (moments.mjs pick --page software) */}
      <section className="section moment band--deep" id="groups" data-moment="word-highlight" aria-labelledby="groups-h">
        <div className="wrap">
          <h2 className="statement" id="groups-h">
            Groups, not dates. Every Hengout plan meets at a café or <span className="hl">public</span> spot
            the team has approved, never in a home or a private room.
          </h2>
          <p className="statement__fact">
            Plans start at least 3 hours after they are posted and end by 9 PM, unless the venue is a checked
            late-evening partner.
          </p>
        </div>
      </section>

      <section className="section" id="plans" aria-labelledby="plans-h">
        <div className="wrap">
          <div className="head">
            <h2 className="h2" id="plans-h">Eight kinds of plans to join</h2>
            <p className="lead">Hosts pick the activity, a venue from the approved list, a time and a group size.</p>
          </div>
          <ul className="plans-grid" role="list">
            {TILES.map((t) => (
              <li key={t.name} className="plan-tile">
                <Picture name={t.name} alt={t.alt} sizes="(min-width: 1280px) 302px, (min-width: 1024px) 23vw, (min-width: 640px) 45vw, 50vw" />
                <div>
                  <h3 className="card-title">{t.label}</h3>
                  <p>{t.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="also">
            <span className="label">Also:</span>
            {MORE.map(({ label, icon: Icon }) => (
              <span key={label} className="chip"><Icon aria-hidden="true" />{label}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="section band--light" id="safety" aria-labelledby="safety-h">
        <div className="wrap split">
          <div className="split__text">
            <div className="head">
              <h2 className="h2" id="safety-h">Safety tools, free for every member</h2>
              <p className="lead">Safety is never behind a paywall. These rules are enforced by Hengout’s servers, not only by the app on your phone.</p>
            </div>
            <ul className="safety-list">
              {SAFETY.map(({ icon: Icon, title, body }) => (
                <li key={title}>
                  <Icon aria-hidden="true" />
                  <h3 className="card-title">{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="split__visual">
            <SosScreen />
          </div>
        </div>
      </section>

      <section className="section" id="kota" aria-labelledby="kota-h">
        <div className="wrap kota">
          <div className="kota__text">
            <div className="head">
              <h2 className="h2" id="kota-h">Starting in Kota</h2>
              <p className="lead">Plans are local, so Hengout opens one city at a time. Kota is first. Filter plans by area:</p>
            </div>
            <ul className="areas">
              {KOTA_AREAS.map((a) => <li key={a}>{a}</li>)}
            </ul>
            <p className="muted small">Outside Kota? Plans are local, so other cities follow Kota one at a time.</p>
          </div>
          <figure className="kota__photo">
            <Picture name="river" alt="A riverside promenade with benches and temple spires at sunset" sizes="(min-width: 1280px) 737px, (min-width: 1024px) 56vw, 100vw" />
          </figure>
        </div>
      </section>

      <section className="section" id="faq" aria-labelledby="faq-h">
        <div className="wrap faq">
          <div className="faq__head">
            <h2 className="h2" id="faq-h">Questions before you join</h2>
            <p className="lead">Straight answers about verification, safety, cost and data.</p>
            <a className="btn btn--secondary" href={`mailto:${SUPPORT_EMAIL}`} style={{ alignSelf: 'flex-start' }}>Email a question</a>
          </div>
          <div className="faq__list">
            {FAQS.map((f) => (
              <details key={f.q} className="faq__item">
                <summary>
                  <h3>{f.q}</h3>
                  <Plus className="faq__icon" aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

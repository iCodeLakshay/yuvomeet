import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BRAND, LEGAL_UPDATED, SUPPORT_EMAIL } from '@/content/site';

const DESCRIPTION = `The terms of use and privacy policy for ${BRAND}: who can join, how plans work, what data we keep, for how long, and your rights under Indian law.`;

export const metadata: Metadata = {
  title: 'Terms & Privacy',
  description: DESCRIPTION,
  alternates: { canonical: '/legal/' },
  openGraph: { url: '/legal/', title: `Terms & Privacy · ${BRAND}`, description: DESCRIPTION },
};

/*
 * Terms of use and privacy policy on one page, kept short and plain. The facts are the app's own:
 * age checks (verify/), venue check-in and SOS (check-in.tsx, sos.tsx), retention (retention_tick in
 * supabase/migrations/20261026000008_jobs.sql) and the processors in supabase/functions/.env.example.
 * Written for India: the IT Act 2000, the IT (Intermediary Guidelines) Rules 2021 and the Digital
 * Personal Data Protection Act 2023.
 */

function Section({ id, n, title, children }: { id?: string; n: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="pt-8 first-of-type:pt-0">
      <h3 className="flex items-baseline gap-3 text-base font-semibold text-white mb-2">
        <span className="font-mono text-[11px] text-neutral-500">{n}</span>
        {title}
      </h3>
      <div className="space-y-2 text-sm leading-relaxed text-secondary [&_strong]:text-on-surface [&_strong]:font-medium">{children}</div>
    </section>
  );
}

const mail = <a className="text-accent-violet hover:text-white transition-colors" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

export default function Legal() {
  return (
    <main id="main" className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-16 md:pt-24 pb-24">
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-secondary text-xs font-semibold tracking-wider uppercase mb-4">
          <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-accent-violet">gavel</span>
          <span>Legal</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight hero-title-gradient mb-3">Terms &amp; Privacy</h1>
        <p className="text-sm text-secondary">
          Last updated {LEGAL_UPDATED}. Short version: be kind, meet in public, and we keep only what we need.
        </p>
        <nav aria-label="On this page" className="mt-6 flex gap-2 text-xs">
          <a className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-secondary hover:text-white transition-colors" href="#terms">Terms of use</a>
          <a className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-secondary hover:text-white transition-colors" href="#privacy">Privacy policy</a>
        </nav>
      </header>

      <article id="terms" className="glass-card rounded-2xl p-6 sm:p-10 mb-6 scroll-mt-28">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-6">Terms of use</h2>

        <Section n="01" title="Agreement">
          <p>
            These terms are an agreement between you and {BRAND} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) for the {BRAND} app, this
            website and the waitlist. By using any of them you accept these terms and the privacy policy below. If you do
            not agree, please do not use {BRAND}.
          </p>
        </Section>

        <Section n="02" title="Who can join">
          <p>
            You must be <strong>18 or older</strong> and pass a one-time ID and selfie check before you join or host a plan.
            One person, one account. Accounts that show the person is under 18 are blocked permanently.
          </p>
        </Section>

        <Section n="03" title="How plans work">
          <p>
            {BRAND} helps groups of 3 to 10 people meet at <strong>approved public venues</strong>. Hosts choose the activity,
            venue, time and who joins. We do not run, supervise or attend plans, and we do not employ hosts or venues.
          </p>
        </Section>

        <Section n="04" title="Your conduct">
          <p>
            Follow the <a className="text-accent-violet hover:text-white transition-colors" href="/community-guidelines/">community guidelines</a>.
            No harassment, hate, threats, sexual content, scams, selling, or sharing someone else&apos;s personal details. Do
            not impersonate anyone, misuse the safety tools or try to break, scrape or reverse-engineer the service.
          </p>
        </Section>

        <Section n="05" title="Your safety">
          <p>
            Meeting new people carries risk. Use your judgement, stay in public, and use Get help (call 112 or alert a
            trusted contact) if you feel unsafe. ID checks lower the risk but cannot guarantee anyone&apos;s behaviour.
          </p>
        </Section>

        <Section n="06" title="Your content">
          <p>
            You own what you post (photos, plans, messages). You give us a limited licence to host and show it to other
            members so the service works. We may remove content or suspend accounts that break these terms or the law.
          </p>
        </Section>

        <Section n="07" title="Paid features">
          <p>
            Core features and all safety tools are free. Optional paid plans are billed through Razorpay at the price shown
            before you pay. Refunds follow the terms shown at checkout and applicable law.
          </p>
        </Section>

        <Section n="08" title="Suspension and leaving">
          <p>
            You can delete your account at any time in the app&apos;s settings. We may suspend or end an account for breaking
            these terms, and you can appeal from the app; a person reviews every appeal.
          </p>
        </Section>

        <Section n="09" title="Liability">
          <p>
            {BRAND} is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not liable for the acts of members or
            venues, or for indirect losses. Nothing here limits rights you have under Indian consumer law.
          </p>
        </Section>

        <Section n="10" title="Law and disputes">
          <p>
            These terms are governed by the laws of India. Courts at Kota, Rajasthan have jurisdiction. We will tell you in the
            app before material changes take effect.
          </p>
        </Section>
      </article>

      <article id="privacy" className="glass-card rounded-2xl p-6 sm:p-10 scroll-mt-28">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-6">Privacy policy</h2>

        <Section n="01" title="What we collect">
          <p>
            <strong>Account:</strong> phone number or email, name, age, gender, city and area, interests, profile photos.{' '}
            <strong>Verification:</strong> the result of your ID and selfie check: your 18+ status, birth year and gender
            result. Your Aadhaar number and ID images are <strong>not</strong> stored by us.{' '}
            <strong>Activity:</strong> plans, join requests, messages, reports, ratings and payments.{' '}
            <strong>Device:</strong> app version, crash reports and basic usage events.{' '}
            <strong>Waitlist:</strong> your email and city.
          </p>
        </Section>

        <Section n="02" title="Location">
          <p>
            Used <strong>once</strong>, only when you check in at a venue (within 150 metres) or press SOS, and then discarded.
            No background tracking.
          </p>
        </Section>

        <Section n="03" title="Why we use it">
          <p>
            To run your account, verify age, show and manage plans, keep members safe, handle reports, process payments, send
            the messages you asked for, and fix bugs. We do <strong>not</strong> sell your data or use it for third-party ads.
          </p>
        </Section>

        <Section n="04" title="Who sees it">
          <p>
            Other members see your profile, not your phone number or email. We use trusted processors, bound by contract, to run
            the service: Supabase (hosting), HyperVerge (age verification), MSG91 (SMS), Resend (email), Razorpay (payments),
            AWS (photo moderation), Google (sign-in and maps), Expo (notifications), Sentry (crash reports) and PostHog
            (usage analytics). We share data with authorities only when the law requires it.
          </p>
        </Section>

        <Section n="05" title="How long we keep it">
          <p>
            Plan chats are deleted 90 days after a plan closes unless tied to an open report. Notifications go after 90 days.
            When you delete your account it is hidden at once and erased within 30 days. To stop banned or under-18 users
            returning, we keep a one-way fingerprint of their ID check.
          </p>
        </Section>

        <Section n="06" title="Your rights">
          <p>
            Under the Digital Personal Data Protection Act, 2023 you can access, correct and erase your data, withdraw consent,
            nominate someone to act for you, and raise a grievance. Download your data or delete your account from the app&apos;s
            settings, change consents any time, or write to {mail}.
          </p>
        </Section>

        <Section n="07" title="Security">
          <p>
            Data is encrypted in transit, access is limited by role, and safety rules are enforced on our servers. No system is
            perfectly secure; we will notify you and the authorities of a breach as the law requires.
          </p>
        </Section>

        <Section n="08" title="Children">
          <p>{BRAND} is for adults only. We do not knowingly collect data from anyone under 18 and delete it when we find it.</p>
        </Section>

        <Section id="grievance" n="09" title="Grievance officer">
          <p>
            For complaints about content, privacy or these terms, write to the Grievance Officer, {BRAND}, at {mail}. We
            acknowledge within 24 hours and aim to resolve within 15 days, as the IT Rules, 2021 require.
          </p>
        </Section>
      </article>
    </main>
  );
}

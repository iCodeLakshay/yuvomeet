import { CarouselDots } from '@/components/CarouselDots';
import { HeroBackdrop } from '@/components/HeroBackdrop';
import { JsonLd } from '@/components/JsonLd';
import { Smoke } from '@/components/Smoke';
import { BannerWaitlistForm, HeroWaitlistForm } from '@/components/WaitlistForm';
import { BRAND, DESCRIPTION, INSTAGRAM_URL, SITE_URL, SUPPORT_EMAIL } from '@/content/site';

const ORG_ID = `${SITE_URL}/#organization`;

// Organization and WebSite only: there is no store listing or real rating to mark up yet.
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: BRAND,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon`,
      email: SUPPORT_EMAIL,
      sameAs: [INSTAGRAM_URL],
    },
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: BRAND, description: DESCRIPTION, inLanguage: 'en-IN', publisher: { '@id': ORG_ID } },
  ],
};

/*
 * The waitlist landing page, from the Google Stitch screen "Waitlist Landing Page (Refined Hero)".
 * The design is responsive (sm/md/lg), so this markup is the desktop and the mobile layout. The
 * header, footer and ambient background live in layout.tsx; the data-* hooks below are animated by
 * components/Motion.tsx (GSAP) and do nothing without it.
 */

export default function Home() {
  return (
    <main id="main" className="flex-1 w-full mx-auto pb-20">
      <JsonLd data={structuredData} />
      {/* Hero: the glowing planet-limb background is components/HeroBackdrop.tsx */}
      <section className="relative w-full -mt-[62px] pt-[calc(4rem+62px)] md:pt-[calc(7rem+62px)] pb-36 md:pb-48 overflow-hidden bg-[#05040a]">
        <HeroBackdrop />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center relative z-10 animate-fade-up motion-reduce:animate-none">
          {/* Eyebrow Badge Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-[0.25rem] rounded-full bg-white/[0.04] border border-white/10 mb-8 backdrop-blur-md hover:border-white/20 transition-all shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75">
              </span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500">
              </span>
            </span>
            <span className="text-[7px] sm:text-xs font-semibold tracking-wider uppercase text-secondary">
              SPONTANEOUS OFFLINE GATHERINGS • <span className="text-white font-semibold">ZERO SPAM</span>
            </span>
            <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[14px]">chevron_right</span>
          </div>
          {/* Dramatic High-Impact Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-extrabold tracking-tighter hero-title-gradient leading-[1.05] mb-6 max-w-4xl">
            Real people. Real plans.<br />
            Skip the swiping.
          </h1>
          {/* Subtitle: Broad Community Audience */}
          <p className="text-secondary text-base sm:text-xl max-w-2xl font-normal leading-relaxed mb-10 text-balance">
            The verified community for people to connect over board games, rooftop chai, weekend hikes, and spontaneous offline plans tonight.
          </p>
          {/* High-Contrast Waitlist & Invite CTA Group */}
          <div className="w-full max-w-lg mb-8" id="waitlist">
            <HeroWaitlistForm />
            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4 text-[12px] text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-neutral-400">verified_user</span>
                Verified Real People
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-neutral-400">shield</span>
                Zero Creeps &amp; Zero Bots
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-neutral-400">lock</span>
                Host-Controlled Circles
              </span>
            </div>
          </div>
          {/* Metric & Social Proof Strip */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-secondary">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-surface-container-highest border-2 border-[#090a0f] flex items-center justify-center text-[10px] font-semibold text-white">AK</div>
              <div className="w-8 h-8 rounded-full bg-neutral-700 border-2 border-[#090a0f] flex items-center justify-center text-[10px] font-semibold text-white">LS</div>
              <div className="w-8 h-8 rounded-full bg-neutral-600 border-2 border-[#090a0f] flex items-center justify-center text-[10px] font-semibold text-white">PD</div>
              <div className="w-8 h-8 rounded-full bg-[#1e202d] border-2 border-[#090a0f] flex items-center justify-center text-[10px] font-semibold text-accent-violet">+2k</div>
            </div>
            <span>Joined by over <strong>2,400+ members</strong> across tech hubs, creative circles &amp; local neighborhoods</span>
          </div>
        </div>
      </section>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bento Grid Interactive Showcase: "Happening This Evening" */}
        <section className="mb-32 md:mb-52 pt-10 md:pt-16" id="reality-of-connection">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-secondary text-[0.6rem] font-semibold tracking-wider uppercase mb-3 backdrop-blur-md">
                <span aria-hidden="true" className="material-symbols-outlined text-[8px] text-accent-violet">psychology</span>
                <span>Science &amp; Reality of Social Connection</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight hero-title-gradient">
                The data behind real connection
              </h2>
            </div>
            <p className="text-sm text-secondary max-w-md leading-relaxed">
              Why spontaneous, IRL micro-gatherings consistently outperform algorithmic feeds, digital small talk, and endless scrolling.
            </p>
          </div>

          {/* 4-Card Bento / Grid Layout for Connection Facts */}
          <div data-reveal className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Metric 1: 73% Digital Fatigue Gauge */}
            <div className="glass-card rounded-2xl p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between group transition-[border-color] duration-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 sm:px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-[11px] font-medium text-secondary flex items-center gap-1.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-amber-accent">trending_down</span>
                    Digital Fatigue
                  </span>
                  <span className="hidden sm:inline text-[11px] font-mono text-neutral-400">01</span>
                </div>
                {/* Minimal Radial Progress Gauge SVG */}
                <div className="relative flex items-center justify-center my-4 py-2">
                  <svg className="w-24 h-24 sm:w-32 sm:h-32 -rotate-90 transform" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
                    <circle data-gauge cx="50" cy="50" r="40" stroke="url(#amberGradient)" strokeWidth="6" strokeDasharray="251.2" strokeDashoffset="67.8" strokeLinecap="round" fill="none" />
                    <defs>
                      <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#fbbf24" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">73%</span>
                    <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">Isolated</span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">Connected yet isolated</h3>
                <p className="text-xs text-secondary leading-relaxed">Screen saturation replaced shared physical space with digital fatigue.</p>
              </div>
              <div className="mt-4 sm:mt-5 pt-3 border-t border-white/5 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between text-[11px] text-secondary">
                <span>Metric</span>
                <span className="text-amber-accent font-medium">IRL Solution Needed</span>
              </div>
            </div>

            {/* Metric 2: 50h Connection Timeline Wave */}
            <div className="glass-card rounded-2xl p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between group transition-[border-color] duration-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 sm:px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-[11px] font-medium text-secondary flex items-center gap-1.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-accent-violet">schedule</span>
                    Social Psychology
                  </span>
                  <span className="hidden sm:inline text-[11px] font-mono text-neutral-400">02</span>
                </div>
                {/* Minimal Step Waveform / Curve SVG */}
                <div className="relative flex items-center justify-center my-4 py-2 h-32">
                  <svg className="w-full h-24 overflow-visible" viewBox="0 0 200 80" fill="none">
                    <defs>
                      <linearGradient id="violetGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#B48CDE" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#B48CDE" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path data-draw d="M 10 70 Q 50 68 80 50 T 140 25 T 190 14" stroke="url(#violetGlowStroke)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <path data-fade d="M 10 70 Q 50 68 80 50 T 140 25 T 190 14 L 190 75 L 10 75 Z" fill="url(#violetGlow)" />
                    <circle cx="190" cy="14" r="4" fill="#B48CDE" className="animate-pulse" />
                    <circle cx="190" cy="14" r="8" stroke="#B48CDE" strokeOpacity="0.4" strokeWidth="1.5" fill="none" />
                    <defs>
                      <linearGradient id="violetGlowStroke" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(180,140,222,0.3)" />
                        <stop offset="100%" stopColor="#B48CDE" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute top-2 left-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white tracking-tight">50h</span>
                    <span className="text-[11px] text-accent-violet font-medium font-mono">IRL</span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">50 shared offline hours</h3>
                <p className="text-xs text-secondary leading-relaxed">Casual encounters evolve into genuine friends after 50 unplanned hours.</p>
              </div>
              <div className="mt-4 sm:mt-5 pt-3 border-t border-white/5 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between text-[11px] text-secondary">
                <span>Presence</span>
                <span className="text-accent-violet font-medium">Organic Chemistry</span>
              </div>
            </div>

            {/* Metric 3: +88% Spontaneous Completion Comparison Chart */}
            <div className="glass-card rounded-2xl p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between group transition-[border-color] duration-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 sm:px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] sm:text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse">
                    </span>
                    Micro-Plans
                  </span>
                  <span className="hidden sm:inline text-[11px] font-mono text-neutral-400">03</span>
                </div>
                {/* Minimal Comparison Histogram Bars SVG */}
                <div className="relative flex items-end justify-between gap-3 my-4 py-2 h-32 px-4">
                  <div className="flex flex-col items-center flex-1 h-full justify-end">
                    <span className="text-[10px] font-mono text-neutral-500 mb-1.5">31%</span>
                    <div data-bar className="w-full max-w-[36px] h-9 rounded-t-md bg-white/10 border-t border-x border-white/15">
                    </div>
                    <span className="text-[9px] text-neutral-400 font-mono mt-2 tracking-tight">Planned</span>
                  </div>
                  <div className="flex flex-col items-center flex-1 h-full justify-end">
                    <span className="text-[11px] font-mono text-emerald-400 font-bold mb-1.5">+88%</span>
                    <div data-bar className="w-full max-w-[36px] h-24 rounded-t-md bg-gradient-to-t from-emerald-500/30 to-emerald-400 border-t border-x border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    </div>
                    <span className="text-[9px] text-emerald-300 font-mono mt-2 tracking-tight">Spontaneous</span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">Micro-plans actually happen</h3>
                <p className="text-xs text-secondary leading-relaxed">Same-day invitations bypass calendar flake and guarantee real attendance.</p>
              </div>
              <div className="mt-4 sm:mt-5 pt-3 border-t border-white/5 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between text-[11px] text-secondary">
                <span>Execution Rate</span>
                <span className="text-emerald-400 font-medium">Happening Tonight</span>
              </div>
            </div>

            {/* Metric 4: 0 mins Flatline Waveform */}
            <div className="glass-card rounded-2xl p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between group transition-[border-color] duration-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 sm:px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-[11px] font-medium text-secondary flex items-center gap-1.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-neutral-400">do_not_disturb_on</span>
                    Zero Addiction
                  </span>
                  <span className="hidden sm:inline text-[11px] font-mono text-neutral-400">04</span>
                </div>
                {/* Minimalist Zero-Latency Pulse / Flatline SVG */}
                <div className="relative flex flex-col items-center justify-center my-4 py-2 h-32">
                  <div className="w-full flex items-center justify-center mb-1">
                    <span className="text-3xl font-extrabold text-white tracking-tight">0</span>
                    <span className="text-sm font-semibold text-neutral-400 ml-1.5">mins</span>
                  </div>
                  <svg className="w-full h-12 overflow-visible px-2" viewBox="0 0 200 40" fill="none">
                    <path data-draw d="M 0 20 L 75 20 L 85 8 L 95 32 L 105 14 L 115 20 L 200 20" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="115" cy="20" r="3" fill="#ffffff" className="animate-ping origin-center [transform-box:fill-box]" />
                    <circle cx="115" cy="20" r="2" fill="#ffffff" />
                  </svg>
                  <span className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase mt-2">Feedless Architecture</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">Zero algorithmic doomscroll</h3>
                <p className="text-xs text-secondary leading-relaxed">Built solely to get you offline and face-to-face with people.</p>
              </div>
              <div className="mt-4 sm:mt-5 pt-3 border-t border-white/5 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between text-[11px] text-secondary">
                <span>Screen Time</span>
                <span className="text-white font-medium">Purpose-Built</span>
              </div>
            </div>
          </div>
        </section>
        {/* Why People Choose Hengout (4-column feature matrix) */}
        <section className="mb-32 md:mb-52" id="features">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs font-semibold tracking-wider text-secondary uppercase mb-2">Built for Real Life</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Why people choose Hengout</h2>
            <p className="text-secondary text-sm mt-3">Tired of dead-end matchmaking algorithms and inactive group chats. We bring back genuine spontaneous connection.</p>
          </div>
          <div data-reveal className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Feature 1: Verified Real People */}
            <div className="glass-card rounded-2xl p-4 sm:p-6 hover:border-white/20 transition-[border-color] duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 sm:px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-[10px] font-mono tracking-wide sm:tracking-wider text-secondary uppercase">
                    Real humans only
                  </span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-emerald-400">verified</span>
                </div>
                {/* Sleek Concentric Security Rings Diagram SVG */}
                <div className="relative flex items-center justify-center my-4 py-2 h-32 rounded-xl overflow-hidden">
                  <svg className="w-28 h-28 overflow-visible" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="50" cy="50" r="32" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" />
                    <circle cx="50" cy="50" r="22" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" />
                    <circle cx="50" cy="50" r="6" fill="#10b981" className="animate-pulse" />
                    {/* Target crosses / radar markers */}
                    <line x1="50" y1="10" x2="50" y2="22" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
                    <line x1="50" y1="78" x2="50" y2="90" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
                    <line x1="10" y1="50" x2="22" y2="50" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
                    <line x1="78" y1="50" x2="90" y2="50" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
                  </svg>
                  <div className="absolute bottom-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#030406]/80 border border-emerald-500/30 text-[9px] font-mono text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400">
                    </span>
                    <span>ID VERIFIED</span>
                  </div>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">Verified Real People</h3>
                <p className="text-xs text-secondary leading-relaxed">Zero bots. Instant ID checks.</p>
              </div>
              <div className="mt-4 sm:mt-5 pt-3 border-t border-white/5 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between text-[11px] text-neutral-400">
                <span>Authenticity</span>
                <span className="text-emerald-400 font-medium font-mono text-[10px]">100% Genuine</span>
              </div>
            </div>

            {/* Feature 2: Spontaneous Meetups */}
            <div className="glass-card rounded-2xl p-4 sm:p-6 hover:border-white/20 transition-[border-color] duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 sm:px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-[10px] font-mono tracking-wide sm:tracking-wider text-secondary uppercase">
                    Happening tonight
                  </span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-accent-violet">bolt</span>
                </div>
                {/* Sleek 24h Radar Arc & Meetup Nodes SVG */}
                <div className="relative flex items-center justify-center my-4 py-2 h-32 rounded-xl overflow-hidden">
                  <svg className="w-full h-24 overflow-visible px-3" viewBox="0 0 160 80" fill="none">
                    <defs>
                      <linearGradient id="arcGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(180,140,222,0.1)" />
                        <stop offset="50%" stopColor="#B48CDE" />
                        <stop offset="100%" stopColor="rgba(245,158,11,0.8)" />
                      </linearGradient>
                    </defs>
                    <path d="M 15 65 A 65 65 0 0 1 145 65" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="4 3" fill="none" />
                    <path data-draw d="M 30 65 A 50 50 0 0 1 130 65" stroke="url(#arcGlow)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    {/* Glowing activity nodes */}
                    <circle cx="45" cy="35" r="4" fill="#B48CDE" />
                    <circle cx="80" cy="15" r="5" fill="#ffffff" className="animate-pulse" />
                    <circle cx="80" cy="15" r="9" stroke="#B48CDE" strokeWidth="1.5" fill="none" opacity="0.5" />
                    <circle cx="118" cy="38" r="4" fill="#f59e0b" />
                    <line x1="80" y1="15" x2="80" y2="65" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="2 2" />
                  </svg>
                  <div className="absolute bottom-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#030406]/80 border border-white/10 text-[9px] font-mono text-secondary">
                    <span className="text-accent-violet font-semibold">NOW</span>
                    <span>— WITHIN 24H</span>
                  </div>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">Spontaneous Meetups</h3>
                <p className="text-xs text-secondary leading-relaxed">Plans within 24h. No endless planning.</p>
              </div>
              <div className="mt-4 sm:mt-5 pt-3 border-t border-white/5 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between text-[11px] text-neutral-400">
                <span>Window</span>
                <span className="text-accent-violet font-medium font-mono text-[10px]">&lt; 24 Hours</span>
              </div>
            </div>

            {/* Feature 3: Safe & Host-Approved */}
            <div className="glass-card rounded-2xl p-4 sm:p-6 hover:border-white/20 transition-[border-color] duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 sm:px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-[10px] font-mono tracking-wide sm:tracking-wider text-secondary uppercase">
                    Host authority
                  </span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-white">shield_person</span>
                </div>
                {/* Sleek Locked Circle & Approval Toggle Diagram SVG */}
                <div className="relative flex items-center justify-center my-4 py-2 h-32 rounded-xl overflow-hidden">
                  <svg className="w-28 h-28 overflow-visible" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="50" r="36" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                    <path d="M 26 50 A 24 24 0 1 1 74 50" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
                    {/* Outer ring ticks */}
                    <circle cx="50" cy="14" r="2" fill="#ffffff" />
                    <circle cx="86" cy="50" r="2" fill="#10b981" />
                    <circle cx="14" cy="50" r="2" fill="rgba(255,255,255,0.3)" />
                    {/* Host Shield Keyhole Lock Center */}
                    <rect x="39" y="43" width="22" height="18" rx="4" fill="#1e202d" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                    <path d="M 44 43 V 38 A 6 6 0 0 1 56 38 V 43" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="50" cy="51" r="2" fill="#10b981" />
                  </svg>
                  <div className="absolute bottom-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#030406]/80 border border-white/10 text-[9px] font-mono text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400">
                    </span>
                    <span>GATEKEEPER ON</span>
                  </div>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">Safe &amp; Host-Approved</h3>
                <p className="text-xs text-secondary leading-relaxed">Host controls every invite. Safe spaces.</p>
              </div>
              <div className="mt-4 sm:mt-5 pt-3 border-t border-white/5 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between text-[11px] text-neutral-400">
                <span>Governance</span>
                <span className="text-white font-medium font-mono text-[10px]">Host Controlled</span>
              </div>
            </div>

            {/* Feature 4: No Endless Swiping */}
            <div className="glass-card rounded-2xl p-4 sm:p-6 hover:border-white/20 transition-[border-color] duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 sm:px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-[10px] font-mono tracking-wide sm:tracking-wider text-secondary uppercase">
                    IRL connection
                  </span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-neutral-400">cancel</span>
                </div>
                {/* Crossed-out swipe card transitioning to face-to-face table SVG */}
                <div className="relative flex items-center justify-center my-4 py-2 h-32 rounded-xl overflow-hidden">
                  <svg className="w-full h-24 overflow-visible px-2" viewBox="0 0 160 80" fill="none">
                    {/* Tilted swipe card crossed out */}
                    <g transform="rotate(-12 36 40)">
                      <rect x="22" y="20" width="28" height="40" rx="4" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="rgba(255,255,255,0.03)" />
                      <line x1="28" y1="28" x2="44" y2="28" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                      <line x1="28" y1="34" x2="38" y2="34" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                      <line x1="19" y1="17" x2="53" y2="63" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                    </g>
                    {/* Direct connection transition arrow */}
                    <path d="M 66 40 L 88 40" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
                    <path d="M 84 36 L 90 40 L 84 44" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Cozy IRL Gathering Circle */}
                    <circle cx="122" cy="40" r="16" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                    <circle cx="122" cy="22" r="3" fill="#ffffff" />
                    <circle cx="122" cy="58" r="3" fill="#ffffff" />
                    <circle cx="104" cy="40" r="3" fill="#ffffff" />
                    <circle cx="140" cy="40" r="3" fill="#ffffff" />
                    <circle cx="122" cy="40" r="5" fill="#B48CDE" className="animate-pulse" />
                  </svg>
                  <div className="absolute bottom-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#030406]/80 border border-white/10 text-[9px] font-mono text-secondary">
                    <span>SWIPING</span>
                    <span className="text-white font-bold">→ IN PERSON</span>
                  </div>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">No Endless Swiping</h3>
                <p className="text-xs text-secondary leading-relaxed">Skip small talk. Meet in person.</p>
              </div>
              <div className="mt-4 sm:mt-5 pt-3 border-t border-white/5 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between text-[11px] text-neutral-400">
                <span>Experience</span>
                <span className="text-white font-medium font-mono text-[10px]">Zero Small Talk</span>
              </div>
            </div>
          </div>
        </section>
        {/* How It Works Step Progression */}
        <section className="mb-32 md:mb-52" id="how-it-works">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-secondary text-xs font-semibold tracking-wider uppercase mb-3 backdrop-blur-md">
                <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-accent-violet">offline_bolt</span>
                <span>Simple &amp; Fast</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight hero-title-gradient">
                How Hengout works in 3 steps
              </h2>
            </div>
            <p className="text-sm text-secondary max-w-md leading-relaxed">
              From digital screen fatigue to sitting across friendly people in under 24 hours. Zero algorithmic games, pure spontaneous human presence.
            </p>
          </div>

          <div id="steps-track" data-reveal className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 relative overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0 pb-1 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Connecting subtle progress line for desktop */}
            <div data-line className="hidden md:block absolute top-[138px] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-emerald-500/20 via-accent-violet/30 to-amber-accent/20 pointer-events-none z-0">
            </div>

            {/* STEP 1 CARD */}
            <div className="glass-card rounded-3xl p-6 sm:p-7 w-[82%] shrink-0 snap-center md:w-auto md:shrink relative overflow-hidden flex flex-col justify-between group hover:border-white/20 transition-[border-color] duration-300 z-10">
              {/* Glow aura */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all">
              </div>

              <div>
                {/* Card Top Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center shadow-inner">01</span>
                    <span className="text-[11px] font-mono tracking-wider text-secondary uppercase">Verification</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse">
                    </span>
                    Verified in 90s
                  </span>
                </div>

                {/* Graphical UI Mockup: ID & Biometric Trust Card */}
                <div className="relative flex items-center justify-center my-4 mb-6 h-28 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-emerald-500/20 transition-all duration-300 overflow-hidden">
                  <div className="absolute w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/20 transition-all">
                  </div>
                  <div data-float className="w-14 h-14 flex items-center justify-center relative">
                    <span aria-hidden="true" className="material-symbols-outlined text-[36px] text-emerald-400">verified_user</span>
                  </div>
                </div>

                {/* Step Title & Copy */}
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">Quick Signup &amp; Verification</h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Confirm your identity seamlessly with student or verified credentials. Earn your trusted community badge and keep the network safe.
                </p>
              </div>

              {/* Bottom metadata */}
              <div className="mt-6 pt-3.5 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-secondary">lock</span>
                  End-to-end private
                </span>
                <span className="text-emerald-400 font-mono text-[10px]">&lt; 2 mins setup</span>
              </div>
            </div>

            {/* STEP 2 CARD */}
            <div className="glass-card rounded-3xl p-6 sm:p-7 w-[82%] shrink-0 snap-center md:w-auto md:shrink relative overflow-hidden flex flex-col justify-between group hover:border-white/20 transition-[border-color] duration-300 z-10">
              {/* Glow aura */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-accent-violet/10 rounded-full blur-2xl pointer-events-none group-hover:bg-accent-violet/20 transition-all">
              </div>

              <div>
                {/* Card Top Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-accent-violet/10 border border-accent-violet/30 text-accent-violet font-mono text-xs font-bold flex items-center justify-center shadow-inner">02</span>
                    <span className="text-[11px] font-mono tracking-wider text-secondary uppercase">Spontaneous Plans</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-accent-violet/10 border border-accent-violet/20 text-[10px] font-mono text-accent-violet flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-violet animate-pulse">
                    </span>
                    Tonight 7:30 PM
                  </span>
                </div>

                {/* Graphical UI Mockup: Spontaneous Hangout Card */}
                <div className="relative flex items-center justify-center my-4 mb-6 h-28 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-accent-violet/20 transition-all duration-300 overflow-hidden">
                  <div className="absolute w-24 h-24 bg-accent-violet/10 rounded-full blur-xl pointer-events-none group-hover:bg-accent-violet/20 transition-all">
                  </div>
                  <div data-float className="w-14 h-14 flex items-center justify-center relative">
                    <span aria-hidden="true" className="material-symbols-outlined text-[36px] text-accent-violet">explore</span>
                  </div>
                </div>

                {/* Step Title & Copy */}
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">Drop or Discover Plans</h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Post what you feel like doing tonight: chai, board games, weekend hiking, cafe co-working, or tap to join curated plans hosted right in your area.
                </p>
              </div>

              {/* Bottom metadata */}
              <div className="mt-6 pt-3.5 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-secondary">schedule</span>
                  Within 24 Hours
                </span>
                <span className="text-accent-violet font-mono text-[10px]">Zero flake culture</span>
              </div>
            </div>

            {/* STEP 3 CARD */}
            <div className="glass-card rounded-3xl p-6 sm:p-7 w-[82%] shrink-0 snap-center md:w-auto md:shrink relative overflow-hidden flex flex-col justify-between group hover:border-white/20 transition-[border-color] duration-300 z-10">
              {/* Glow aura */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-accent/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-accent/20 transition-all">
              </div>

              <div>
                {/* Card Top Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-amber-accent/10 border border-amber-accent/30 text-amber-accent font-mono text-xs font-bold flex items-center justify-center shadow-inner">03</span>
                    <span className="text-[11px] font-mono tracking-wider text-secondary uppercase">IRL Meeting</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-mono text-white flex items-center gap-1">
                    <span aria-hidden="true" className="material-symbols-outlined text-[11px] text-emerald-400">check_circle</span>
                    Approved
                  </span>
                </div>

                {/* Graphical UI Mockup: Circle Coordination & Radar Hub */}
                <div className="relative flex items-center justify-center my-4 mb-6 h-28 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-amber-accent/20 transition-all duration-300 overflow-hidden">
                  <div className="absolute w-24 h-24 bg-amber-accent/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-accent/20 transition-all">
                  </div>
                  <div data-float className="w-14 h-14 flex items-center justify-center relative">
                    <span aria-hidden="true" className="material-symbols-outlined text-[36px] text-amber-accent">groups</span>
                  </div>
                </div>

                {/* Step Title & Copy */}
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">Meet Up IRL</h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Once the host approves your join request, coordinate the exact meetup spot in the private circle chat, show up, and enjoy authentic connection.
                </p>
              </div>

              {/* Bottom metadata */}
              <div className="mt-6 pt-3.5 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-secondary">group</span>
                  Micro-circle (4-8 pax)
                </span>
                <span className="text-white font-medium text-[10px]">Face-to-face</span>
              </div>
            </div>
          </div>
          <CarouselDots targetId="steps-track" count={3} label="How Hengout works, step" />
        </section>
        {/* Final High-Conversion Framer CTA Banner: words on the left, the stacked form on the right */}
        <section className="mb-12" data-reveal>
          <div
            data-smoke-zone
            className="glass-card rounded-3xl p-8 sm:p-14 relative overflow-hidden border border-white/15 grid md:grid-cols-2 items-center gap-10 md:gap-12"
          >
            {/* Smoke in the hero's #4a3b5d family, on the form's side only (the bottom on phones, the right half from md).
                It sits behind the content (-z-10) and leans a little toward the mouse (see Motion.tsx). */}
            <Smoke className="inset-x-0 bottom-0 h-3/5 [mask-image:radial-gradient(ellipse_75%_62%_at_50%_72%,#000_24%,transparent_100%)] md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[62%] md:[mask-image:radial-gradient(ellipse_64%_78%_at_62%_50%,#000_22%,transparent_100%)]" />
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              {/* Founding Member Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white mb-6 text-left">
                <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-amber-accent">stars</span>
                Top 10% on the waitlist receive permanent Founding Member privileges
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight max-w-2xl mb-4 text-balance">
                Ready to reclaim your offline life?
              </h2>
              <p className="text-secondary text-sm sm:text-base max-w-lg">
                Stop endlessly scrolling feeds and dead group chats. Join the priority waitlist and get first access when circles drop in your neighborhood.
              </p>
            </div>
            <div className="w-full max-w-md mx-auto md:mx-0 md:justify-self-end flex flex-col">
              {/* Banner Waitlist input, with the button below it */}
              <BannerWaitlistForm />
              <div className="mt-6 flex items-center justify-center md:justify-start gap-2 text-xs text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Weekly cohort allocation active • Zero spam guaranteed
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

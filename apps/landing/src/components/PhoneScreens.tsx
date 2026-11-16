import { ArrowRight, BadgeCheck, Bell, Clock, Coffee, Flag, Hourglass, LocateFixed, MapPin, Music, PartyPopper, Phone as PhoneIcon, Search, Share2, SlidersHorizontal, Users, Venus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Picture } from './Picture';

/*
 * The app's own screens rebuilt as HTML, with the labels the app really shows (fact sheet section 7:
 * (tabs)/index.tsx, plan/[id]/join.tsx, safety/sos.tsx). Names, venues and times are fictional. Each
 * phone is one image to assistive tech (role="img" plus a label); its inner text is hidden from it,
 * so a screen reader hears one sentence instead of every chip.
 */

function Phone({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`phone ${className ?? ''}`} role="img" aria-label={label}>
      <div className="phone__screen" aria-hidden="true">
        <div className="phone__status">
          <span className="mono">9:41</span>
          <span className="phone__notch" />
          <span className="phone__bars" />
        </div>
        {children}
      </div>
    </div>
  );
}

function Avatar({ initial, verified = false, tone = 'a' }: { initial: string; verified?: boolean; tone?: 'a' | 'b' | 'c' | 'd' }) {
  return (
    <span className={`ui-avatar ui-avatar--${tone}`}>
      {initial}
      {verified ? <BadgeCheck className="ui-avatar__tick" /> : null}
    </span>
  );
}

export function DiscoverScreen({ className }: { className?: string }) {
  return (
    <Phone className={className} label="Hengout's Discover screen in Kota, listing an evening chai plan with 4 spots left and a music jam for women only.">
      <div className="ui-top">
        <div className="ui-row">
          <span className="ui-iconbtn ui-iconbtn--blue"><LocateFixed /></span>
          <span className="ui-loc">
            <strong>Kota, India</strong>
            <small>Verified 18+ member</small>
          </span>
          <span className="ui-iconbtn ui-iconbtn--blue ui-bell"><Bell /></span>
        </div>
        <div className="ui-row">
          <span className="ui-search"><Search />Search plans, cafés, or jams...</span>
          <span className="ui-filter"><SlidersHorizontal />Filters</span>
        </div>
      </div>
      <div className="ui-chips">
        <span className="ui-chip ui-chip--on">All</span>
        <span className="ui-chip"><Coffee />Chai &amp; Cafe</span>
        <span className="ui-chip"><Music />Music &amp; Jam</span>
      </div>
      <div className="ui-listhead">
        <strong>Active gatherings</strong>
        <small>Kota hub</small>
      </div>
      <div className="ui-card">
        <div className="ui-cover">
          <Picture name="chai" alt="" sizes="280px" />
          <span className="ui-glass ui-glass--tl">Chai &amp; Cafe</span>
          <span className="ui-cover__time"><Clock />Today, 6:30 PM</span>
          <span className="ui-glass ui-glass--br">4 spots left</span>
        </div>
        <strong className="ui-card__title">Evening chai &amp; casual discussion</strong>
        <span className="ui-card__venue"><MapPin />Chai café, Talwandi</span>
        <div className="ui-card__foot">
          <span className="ui-host"><Avatar initial="R" verified />Riya</span>
          <span className="ui-stack"><Avatar initial="A" tone="b" /><Avatar initial="K" tone="c" /><Avatar initial="+2" tone="d" /></span>
          <span className="ui-join">Join</span>
        </div>
      </div>
      <div className="ui-card">
        <div className="ui-cover">
          <Picture name="music" alt="" sizes="280px" />
          <span className="ui-glass ui-glass--tl">Music &amp; Jam</span>
          <span className="ui-glass ui-glass--tl2"><Venus />Women only</span>
          <span className="ui-cover__time"><Clock />Sat, 5:00 PM</span>
          <span className="ui-glass ui-glass--br">2 spots left</span>
        </div>
        <strong className="ui-card__title">Saturday sing-along, bring a song</strong>
      </div>
    </Phone>
  );
}

export function JoinScreen({ className }: { className?: string }) {
  return (
    <Phone className={className} label="Hengout's Join Meetup sheet: a request to join an evening chai plan with a short note to the host.">
      <div className="ui-dim">
        <Picture name="chai" alt="" sizes="300px" />
      </div>
      <div className="ui-sheet">
        <span className="ui-grab" />
        <strong className="ui-sheet__title">Join Meetup</strong>
        <div className="ui-summary">
          <span className="ui-summary__text">
            <small><i className="ui-dot" />Chai &amp; Cafe · Chai café, Talwandi</small>
            <strong>Evening chai &amp; casual discussion</strong>
            <small>Today, 6:30 PM · Hosted by Riya</small>
          </span>
          <Avatar initial="R" verified />
        </div>
        <div className="ui-strip">
          <Users />
          <span>4 spots remaining</span>
          <span className="ui-strip__free">Free entry <small>(pay for your own order)</small></span>
        </div>
        <div className="ui-field">
          <small>Note to host (optional)</small>
          <span className="ui-input">New to Kota and studying for exams. Would love a chai break with people.<i className="ui-caret" /></span>
          <small className="ui-count mono">72/140</small>
        </div>
        <span className="ui-primary">Request to Join<ArrowRight /></span>
      </div>
    </Phone>
  );
}

export function SosScreen({ className }: { className?: string }) {
  return (
    <Phone className={className} label="Hengout's Get help now sheet with buttons to call 112 and to send your location to a trusted contact on WhatsApp.">
      <div className="ui-dim">
        <Picture name="river" alt="" sizes="300px" />
      </div>
      <div className="ui-sheet ui-sheet--tall">
        <span className="ui-grab" />
        <strong className="ui-sheet__title">Get help now</strong>
        <small className="ui-sheet__sub">If you feel unsafe, leave and go somewhere busy first.</small>
        <span className="ui-sos"><PhoneIcon />Call 112</span>
        <span className="ui-secondary"><Share2 />Send my location to Neha</span>
        <span className="ui-notice">Your location goes from your phone to WhatsApp. Hengout only records that SOS was pressed, so moderators can follow up.</span>
        <span className="ui-ghost"><Flag />Report someone at this plan</span>
      </div>
    </Phone>
  );
}

/** The hero's result card: a join request becoming a seat. At rest (no script, reduced motion) it shows the seat. */
export function ResultCard({ className }: { className?: string }) {
  return (
    <div className={`result ${className ?? ''}`} aria-hidden="true" data-loop="result">
      <div className="result__state" data-state="sent">
        <span className="result__icon"><Hourglass /></span>
        <span>
          <strong>Request sent</strong>
          <small>Riya will review it. We’ll notify you either way.</small>
        </span>
      </div>
      <div className="result__state" data-state="in">
        <span className="result__icon result__icon--in"><PartyPopper /></span>
        <span>
          <strong>You’re in!</strong>
          <small>The group chat is open. Say hi, and share the plan with a trusted contact.</small>
        </span>
      </div>
    </div>
  );
}

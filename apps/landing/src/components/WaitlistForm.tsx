'use client';

import { useState, type FormEvent } from 'react';

/*
 * The two waitlist forms from the Stitch design "Waitlist Landing Page (Refined Hero)",
 * with the design's own behaviour: a short "Securing spot..." state, then a disabled "Priority
 * Reserved" button and a success note. Like the design, it does not send the entry anywhere yet.
 */

type State = 'idle' | 'busy' | 'done';

const ICON = 'material-symbols-outlined';

export function HeroWaitlistForm() {
  const [value, setValue] = useState('');
  const state = useReserve(value);

  return (
    <div className="rounded-2xl p-2 sm:p-2.5">
      <form className="flex flex-col sm:flex-row gap-2" onSubmit={state.submit}>
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary">
            <span aria-hidden="true" className={`${ICON} text-[19px]`}>mail</span>
          </div>
          <input
            className="w-full bg-[#030406]/90 text-white placeholder:text-neutral-500 text-sm rounded-xl py-3 pl-10 pr-3 border border-white/10 focus:border-accent-violet/60 focus:ring-1 focus:ring-accent-violet/50 focus:outline-none transition-all"
            id="studentContactMain"
            aria-label="Email or phone number"
            placeholder="Enter your email or phone number"
            required
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={state.status === 'done'}
          />
        </div>
        <button
          className={`self-center sm:self-auto py-3 px-5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-colors whitespace-nowrap shadow-lg group ${state.status === 'done' ? 'bg-neutral-800 text-white border border-white/20' : 'bg-white text-surface hover:bg-neutral-100'
            }`}
          id="joinBtnMain"
          data-magnetic
          type="submit"
          disabled={state.status === 'done'}
        >
          {state.status === 'idle' && (
            <>
              <span>Reserve Early Access</span>
              <span aria-hidden="true" className={`${ICON} text-[17px] group-hover:translate-x-0.5 transition-transform`}>arrow_forward</span>
            </>
          )}
          {state.status === 'busy' && (
            <>
              <span aria-hidden="true" className={`${ICON} text-[17px] animate-spin`}>sync</span>
              <span>Securing spot...</span>
            </>
          )}
          {state.status === 'done' && (
            <>
              <span>Priority Reserved</span>
              <span aria-hidden="true" className={`${ICON} text-[17px]`}>check</span>
            </>
          )}
        </button>
      </form>
      <div className={`${state.status === 'done' ? '' : 'hidden '}mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center`} id="successMsgMain" role="status">
        {state.status === 'done' && (
          <>
            <p className="text-sm font-medium text-emerald-300">You&apos;re on the priority cohort! 🎉</p>
            <p className="text-xs text-secondary mt-0.5">Check your inbox for your community verification invite.</p>
          </>
        )}
      </div>
    </div>
  );
}

export function BannerWaitlistForm() {
  const [value, setValue] = useState('');
  const state = useReserve(value);

  return (
    <>
      {/* The input with the button below it, one under the other at every width; the button is as wide as its label. */}
      <form className="w-full max-w-md flex flex-col gap-3" onSubmit={state.submit}>
        <input
          className="w-full bg-[#030406]/90 text-white placeholder:text-neutral-500 text-sm rounded-xl py-3.5 px-4 border border-white/10 focus:border-accent-violet/60 focus:ring-1 focus:ring-accent-violet/50 focus:outline-none"
          id="studentContactBottom"
          aria-label="Email or phone number"
          placeholder="Enter your email or phone number"
          required
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={state.status === 'done'}
        />
        <button
          className={`self-center md:self-start py-3.5 px-6 rounded-xl text-sm font-semibold active:scale-95 transition-colors whitespace-nowrap shadow-lg flex items-center justify-center gap-1.5 ${state.status === 'done' ? 'bg-neutral-800 text-white border border-white/20' : 'bg-white text-surface hover:bg-neutral-100'
            }`}
          id="joinBtnBottom"
          data-magnetic
          type="submit"
          disabled={state.status === 'done'}
        >
          {state.status === 'idle' && 'Get Early Access'}
          {state.status === 'busy' && (
            <>
              <span aria-hidden="true" className={`${ICON} text-[17px] animate-spin`}>sync</span>
              <span>Securing spot...</span>
            </>
          )}
          {state.status === 'done' && (
            <>
              <span>Priority Reserved</span>
              <span aria-hidden="true" className={`${ICON} text-[17px]`}>check</span>
            </>
          )}
        </button>
      </form>
      <div className={`${state.status === 'done' ? '' : 'hidden '}mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center max-w-md w-full`} id="successMsgBottom" role="status">
        {state.status === 'done' && (
          <>
            <p className="text-sm font-medium text-emerald-300">Cohort spot secured! 🎉</p>
            <p className="text-xs text-secondary mt-0.5">Verification link dispatched to your contact.</p>
          </>
        )}
      </div>
    </>
  );
}

/** The design's showWaitlistSuccess(): more than 3 characters, then 500 ms of "Securing spot...". */
function useReserve(value: string) {
  const [status, setStatus] = useState<State>('idle');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (status !== 'idle' || value.trim().length <= 3) return;
    setStatus('busy');
    window.setTimeout(() => setStatus('done'), 500);
  };
  return { status, submit };
}

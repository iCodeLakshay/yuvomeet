'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MAIN_ACTION, NAV_LINKS, SUPPORT_EMAIL } from '@/content/site';
import { Mark } from './Mark';

/** Fixed header: the mark, four section links and the one main action. Below 900px the links fold into a menu. */
export function Nav() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`nav${open ? ' is-open' : ''}`}>
      <div className="wrap nav__row">
        <Link href="/" className="mark" aria-label="Hengout home" onClick={close}>
          <Mark size={26} />
          <span className="mark__word">hengout</span>
        </Link>
        <button
          ref={toggle}
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="nav-links"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
        <nav aria-label="Main">
          <ul className="nav__links" id="nav-links">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close}>{l.label}</Link>
              </li>
            ))}
            <li className="nav__menu-cta">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn--primary" onClick={close}>{MAIN_ACTION}</a>
            </li>
          </ul>
        </nav>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn--primary nav__cta">{MAIN_ACTION}</a>
      </div>
    </header>
  );
}

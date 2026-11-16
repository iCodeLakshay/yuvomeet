import Link from 'next/link';
import { BRAND, MAIN_ACTION, SUPPORT_EMAIL } from '@/content/site';
import { Mark } from './Mark';
import { Mail } from 'lucide-react';

/** The close and the footer are one section (tasteskill layout-v4): the contact line, then the links. */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="closing" id="contact" aria-labelledby="contact-h">
      <div className="wrap">
        <div className="close">
          <h2 className="h2" id="contact-h">Hengout opens in Kota first</h2>
          <div className="close__text">
            <p className="lead">Questions about plans, safety or how Hengout works? Write to the team and a person replies.</p>
          </div>
          <div className="close__form">
            <a className="btn btn--primary" href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail aria-hidden="true" />
              {MAIN_ACTION}
            </a>
          </div>
        </div>
        <div className="foot">
          <div className="foot__row">
            <Link href="/" className="mark" aria-label="Hengout home">
              <Mark size={24} />
              <span className="mark__word">hengout</span>
            </Link>
            <nav aria-label="Footer">
              <ul className="foot__links">
                <li><Link href="/#how-it-works">How it works</Link></li>
                <li><Link href="/#safety">Safety</Link></li>
                <li><Link href="/community-guidelines/">Community guidelines</Link></li>
                <li><Link href="/#faq">Questions</Link></li>
                <li><a href={`mailto:${SUPPORT_EMAIL}`}>Email support</a></li>
              </ul>
            </nav>
          </div>
          <p className="foot__legal">
            © {year} {BRAND}. An Android app for small group plans in Kota, Rajasthan.
          </p>
        </div>
      </div>
    </footer>
  );
}

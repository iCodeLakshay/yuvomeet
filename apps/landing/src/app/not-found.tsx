import type { Metadata } from 'next';
import Link from 'next/link';

// Next marks this page noindex itself; a second robots tag would only conflict.
export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main id="main" className="page">
      <div className="wrap head">
        <h1 className="h1">This page is not here</h1>
        <p className="lead">The link may be old, or the address may have a typo.</p>
        <p>
          <Link className="btn btn--primary" href="/">Go to the home page</Link>
        </p>
      </div>
    </main>
  );
}

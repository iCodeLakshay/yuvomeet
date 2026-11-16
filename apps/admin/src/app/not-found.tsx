import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="auth">
      <div className="auth-box">
        <div className="card">
          <h1>Page not found</h1>
          <p className="muted">The link may be old, or the record may no longer exist.</p>
          <div className="row">
            <Link className="btn primary" href="/">
              Go to the dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

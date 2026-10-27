import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { signOut } from '../login/actions';

const NAV: [string, string, boolean][] = [
  ['/queue', 'Review queue', false],
  ['/appeals', 'Appeals', false],
  ['/users', 'Users', false],
  ['/venues', 'Venues', true],
  ['/cities', 'Cities', true],
  ['/audit', 'Audit log', false],
];

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const { role, email } = await requireAdmin();
  return (
    <div className="shell">
      <nav className="side" aria-label="Console">
        <div className="brand">Yuvomeet</div>
        {NAV.filter(([, , adminOnly]) => !adminOnly || role === 'admin').map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
        <div className="foot">
          <span className="muted">{email}</span>
          <Badge value={role} tone={role === 'admin' ? 'accent' : 'neutral'} />
          <form action={signOut}>
            <button className="btn">Sign out</button>
          </form>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

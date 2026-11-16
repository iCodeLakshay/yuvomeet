import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/Mark';
import { NavProgress, RouteTransition } from '@/components/motion';
import { Nav, type NavSection } from '@/components/Nav';
import { SignOutButton } from '@/components/SignOutButton';
import { Badge } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const { supabase, role, email } = await requireAdmin();
  const full = role === 'admin';

  // Waiting-work counters for the sidebar (head-only counts, no rows are fetched).
  const [queue, severe, appeals, reports] = await Promise.all([
    supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_review', 'escalated']),
    supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_review', 'escalated']).eq('severity', 'severe'),
    supabase.from('appeals').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  // Admin-only pages are hidden from reviewers here as a courtesy; the database is what refuses them.
  const sections: NavSection[] = [
    { label: 'Overview', items: [{ href: '/', label: 'Dashboard', icon: 'dashboard' }] },
    {
      label: 'Moderation',
      items: [
        { href: '/queue', label: 'Review queue', icon: 'queue', count: queue.count, urgent: (severe.count ?? 0) > 0 },
        { href: '/reports', label: 'Reports', icon: 'flag', count: reports.count },
        { href: '/appeals', label: 'Appeals', icon: 'appeal', count: appeals.count },
        { href: '/messages', label: 'Chat moderation', icon: 'message' },
      ],
    },
    {
      label: 'Community',
      items: [
        { href: '/users', label: 'Members', icon: 'users' },
        { href: '/plans', label: 'Plans', icon: 'calendar' },
      ],
    },
    ...(full
      ? [
        {
          label: 'Places',
          items: [
            { href: '/cities', label: 'Cities', icon: 'building' as const },
            { href: '/venues', label: 'Venues', icon: 'venue' as const },
            { href: '/colleges', label: 'Colleges', icon: 'college' as const },
          ],
        },
        {
          label: 'Money',
          items: [
            { href: '/payments', label: 'Payments', icon: 'card' as const },
            { href: '/payouts', label: 'Host payouts', icon: 'wallet' as const },
          ],
        },
        {
          label: 'Growth',
          items: [
            { href: '/waitlist', label: 'Waitlist', icon: 'list' as const },
            { href: '/announcements', label: 'Announcements', icon: 'bell' as const },
          ],
        },
        {
          label: 'Configuration',
          items: [
            { href: '/catalog', label: 'Interests & activities', icon: 'tag' as const },
            { href: '/settings', label: 'App settings', icon: 'settings' as const },
            { href: '/staff', label: 'Staff & roles', icon: 'role' as const },
          ],
        },
      ]
      : []),
    { label: 'Records', items: [{ href: '/audit', label: 'Audit log', icon: 'history' }] },
  ];

  // The shell is exactly one screen tall: the sidebar and the page each scroll on their own, so scrolling
  // the navigation never moves the page and the page never drags the navigation along.
  return (
    <div className="shell">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <nav className="side" aria-label="Console">
        <Link href="/" className="brand" aria-label="Hengout admin, dashboard">
          <Logo height={34} />
          <span className="brand-tag">Admin</span>
        </Link>
        <Nav sections={sections} />
        <div className="foot">
          <div className="who">
            <span className="avatar" aria-hidden="true">
              {(email[0] ?? '?').toUpperCase()}
            </span>
            <div className="who-text">
              <span title={email}>{email}</span>
              <Badge value={role} tone={full ? 'accent' : 'neutral'} />
            </div>
          </div>
          <SignOutButton />
        </div>
      </nav>
      <main id="content">
        <NavProgress />
        <RouteTransition>{children}</RouteTransition>
      </main>
    </div>
  );
}

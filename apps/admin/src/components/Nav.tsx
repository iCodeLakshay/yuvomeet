'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './Icon';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** A count of things waiting (open queue items, appeals); hidden at zero. */
  count?: number | null;
  urgent?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/** Sidebar links with the current page marked (aria-current), so reviewers always know where they are. */
export function Nav({ sections }: { sections: NavSection[] }) {
  const path = usePathname();
  const current = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));
  return (
    <div className="navscroll">
      {sections.map((s) => (
        <div key={s.label} role="group" aria-label={s.label}>
          <div className="navlabel" aria-hidden="true">
            {s.label}
          </div>
          <div className="navgroup">
            {s.items.map((i) => (
              <Link key={i.href} href={i.href} className="navlink" aria-current={current(i.href) ? 'page' : undefined}>
                <Icon name={i.icon} />
                <span className="navtext">{i.label}</span>
                {i.count ? (
                  <span className={`navcount${i.urgent ? ' urgent' : ''}`} aria-label={`${i.count} waiting`}>
                    {i.count > 99 ? '99+' : i.count}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

import Link from 'next/link';

export function SettingsTabs({ current }: { current: 'settings' | 'filters' }) {
  return (
    <nav className="tabs">
      <Link href="/settings" className={current === 'settings' ? 'active' : undefined}>
        Limits and thresholds
      </Link>
      <Link href="/settings/filters" className={current === 'filters' ? 'active' : undefined}>
        Content filter
      </Link>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export interface NavItem {
  href: string;
  label: string;
  /** Rendered on the server and passed down — icons are static markup. */
  icon: ReactNode;
}

/**
 * The sidebar navigation.
 *
 * A client component for one reason only: `usePathname`. A server layout has
 * no access to the current route, so without this there is no active state —
 * and a panel with five destinations and no indication of which one you are on
 * is genuinely disorienting once you have clicked into a detail view.
 *
 * The items themselves (labels, icons) are built on the server and handed
 * down, so the locale dictionary never has to cross into a client bundle.
 */
export function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    // Horizontal and scrollable below lg, vertical above it. Declared here
    // rather than by a `[&>nav]` variant on the parent: two `display`
    // utilities with equal specificity are resolved by stylesheet order, so
    // the parent silently lost and the strip pushed the page sideways.
    <nav className="flex w-max gap-1 lg:grid lg:w-auto" aria-label="Sections">
      {items.map((item) => {
        // Every route is a top-level section, so only "/" needs exact
        // matching — the rest should stay lit on their own sub-pages.
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'touch group flex shrink-0 items-center gap-sm whitespace-nowrap rounded-md px-sm text-[15px]',
              'transition-colors duration-150',
              active
                ? 'bg-primary text-on-primary font-semibold'
                : 'text-inverse-on-surface/85 hover:bg-white/10 hover:text-inverse-on-surface',
            ].join(' ')}
          >
            <span
              className={[
                'shrink-0 transition-opacity',
                active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100',
              ].join(' ')}
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

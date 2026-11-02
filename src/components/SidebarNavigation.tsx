'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Bot,
  BriefcaseBusiness,
  FilePlus2,
  Files,
  LayoutDashboard,
  WandSparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type NavigationItem = {
  label: string;
  icon: LucideIcon;
} & (
  | { href: string; comingSoon?: false }
  | { href?: never; comingSoon: true }
);

const navigation: { title: string; items: NavigationItem[] }[] = [
  {
    title: 'WORKSPACE',
    items: [
      { label: 'Overview', href: '/', icon: LayoutDashboard },
      { label: 'Contract Review', href: '/review', icon: FilePlus2 },
      { label: 'My Documents', href: '/reviews', icon: Files },
    ],
  },
  {
    title: 'AI INTELLIGENCE',
    items: [
      { label: 'Legal Assistant', href: '/legal-assistant', icon: Bot },
      { label: 'Case Guidance', href: '/case-guidance', icon: BriefcaseBusiness },
      { label: 'Legal Document Drafting', href: '/legal-drafting', icon: WandSparkles },
    ],
  },
  {
    title: 'RESOURCES',
    items: [{ label: 'Knowledge Library', icon: BookOpen, comingSoon: true }],
  },
];

export default function SidebarNavigation() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-navigation" aria-label="Main navigation">
      {navigation.map((section) => (
        <div className="nav-section" key={section.title}>
          <p className="nav-section-title">{section.title}</p>
          <div className="nav-items">
            {section.items.map((item) => {
              const Icon = item.icon;
              if (item.comingSoon) {
                return (
                  <div
                    key={item.label}
                    className="nav-item nav-item-disabled"
                    aria-disabled="true"
                    title="Coming soon"
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    <span className="coming-soon">Soon</span>
                  </div>
                );
              }

              const active =
                pathname === item.href ||
                (item.href === '/reviews' && pathname.startsWith('/reviews/'));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`nav-item ${active ? 'nav-item-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {active && <span className="nav-active-indicator" />}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

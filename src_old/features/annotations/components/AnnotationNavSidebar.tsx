'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Pencil, Layers, Grid, Wand2, Download } from 'lucide-react';
import HoverableSidebar from '@/components/layout/HoverableSidebar';
import SidebarNavItem from '@/components/layout/SidebarNavItem';

const NAV_ITEMS = [
  { key: 'annotate', label: 'Annotate', href: '/annotate', icon: Pencil },
  { key: 'layers', label: 'Layers', href: '/annotate/layers', icon: Layers },
  { key: 'grid', label: 'Grid', href: '/annotate/grid', icon: Grid },
  { key: 'auto', label: 'Auto', href: '/annotate/auto', icon: Wand2 },
  { key: 'export', label: 'Export', href: '/annotate/export', icon: Download },
];

export default function AnnotationNavSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const footer = (
    <>
      <p className="mb-1 font-semibold">Tips</p>
      <ul className="list-disc ml-4 space-y-1">
        <li>Shift+Drag to pan</li>
        <li>Hold G to toggle grid</li>
        <li>W to auto-label</li>
      </ul>
    </>
  );

  return (
    <HoverableSidebar
      footer={footer}
    >
      {NAV_ITEMS.map((item) => (
        <SidebarNavItem
          key={item.key}
          icon={item.icon}
          label={item.label}
          isActive={pathname === item.href || pathname?.startsWith(item.href + '/')}
          onClick={() => router.push(item.href)}
        />
      ))}
    </HoverableSidebar>
  );
}

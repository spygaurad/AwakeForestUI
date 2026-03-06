'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Folder, ImageIcon, Cpu } from 'lucide-react';
import HoverableSidebar from './HoverableSidebar';
import SidebarNavItem from './SidebarNavItem';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'projects', label: 'Projects', href: '/projects', icon: Folder },
  { key: 'datasets', label: 'Datasets', href: '/datasets', icon: ImageIcon },
  { key: 'models', label: 'Models', href: '/ml-models', icon: Cpu },
];

export default function PrimarySidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <HoverableSidebar
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

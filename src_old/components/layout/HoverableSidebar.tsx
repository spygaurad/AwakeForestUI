'use client';

import { ReactNode, createContext, useContext } from 'react';
import clsx from 'clsx';
import { useHoverableSidebar } from '@/hooks/use-hoverable-sidebar';

const SidebarContext = createContext<{ isExpanded: boolean }>({ isExpanded: false });

export const useSidebarContext = () => useContext(SidebarContext);

interface HoverableSidebarProps {
  children: ReactNode;
  footer?: ReactNode;
  topOffset?: number;
}

export default function HoverableSidebar({
  children,
  footer,
  topOffset = 48,
}: HoverableSidebarProps) {
  const { isExpanded, width, handleMouseEnter, handleMouseLeave } = useHoverableSidebar();

  return (
    <SidebarContext.Provider value={{ isExpanded }}>
      <div
        className="fixed left-0 z-40 hidden sm:block"
        style={{ top: topOffset, height: `calc(100vh - ${topOffset}px)` }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Hover buffer */}
        <div
          className="absolute top-0 h-full"
          style={{ left: 64, width: 12, pointerEvents: isExpanded ? 'none' : 'auto' }}
        />

        <aside
          className={clsx(
            'bg-gray-900 text-white border-r border-gray-800 h-full overflow-hidden',
            'transition-[width] duration-200 ease-out flex flex-col'
          )}
          style={{ width }}
        >
          {/* Nav items */}
          <div className="flex-1 overflow-y-auto">
            <nav className="p-2 space-y-1">{children}</nav>
          </div>

          {/* Footer */}
          {footer && (
            <div
              className={clsx(
                'p-3 text-xs text-gray-300/90 border-t border-gray-800 shrink-0',
                isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none',
                'transition-opacity duration-200'
              )}
            >
              {footer}
            </div>
          )}
        </aside>
      </div>
    </SidebarContext.Provider>
  );
}

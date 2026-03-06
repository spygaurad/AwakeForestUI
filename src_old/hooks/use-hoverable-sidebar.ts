import { useState, useRef, useEffect } from 'react';

interface UseHoverableSidebarOptions {
  collapsedWidth?: number;
  expandedWidth?: number;
  leaveDelay?: number;
}

export function useHoverableSidebar({
  collapsedWidth = 64,
  expandedWidth = 240,
  leaveDelay = 150,
}: UseHoverableSidebarOptions = {}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const leaveTimer = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => {
      setIsExpanded(false);
      leaveTimer.current = null;
    }, leaveDelay) as unknown as number;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  return {
    isExpanded,
    width: isExpanded ? expandedWidth : collapsedWidth,
    handleMouseEnter,
    handleMouseLeave,
  };
}

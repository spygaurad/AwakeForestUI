import * as React from "react"

const MOBILE_BREAKPOINT = 768
// Map editor breakpoint — below this, panels switch to bottom-sheet layout
const COMPACT_BREAKPOINT = 900

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

/** True when viewport width < 900px. Use for map editor panel layout switching. */
export function useIsCompact() {
  const [isCompact, setIsCompact] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT - 1}px)`)
    const onChange = () => setIsCompact(window.innerWidth < COMPACT_BREAKPOINT)
    mql.addEventListener('change', onChange)
    setIsCompact(window.innerWidth < COMPACT_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isCompact
}

import { useEffect, useRef } from 'react'

export type UsePageVisibilityProps = {
  onHidden: () => void
  onVisible: () => void
  enabled: boolean
}

/**
 * Hook reagujący na `visibilitychange` na `document`.
 *
 * - Wywołuje `onHidden` gdy `document.visibilityState === 'hidden'`.
 * - Wywołuje `onVisible` gdy `document.visibilityState === 'visible'`.
 * - Cleanup przy unmount oraz przy `enabled=false`.
 */
export function usePageVisibility({
  onHidden,
  onVisible,
  enabled,
}: UsePageVisibilityProps): void {
  const onHiddenRef = useRef(onHidden)
  const onVisibleRef = useRef(onVisible)

  useEffect(() => {
    onHiddenRef.current = onHidden
  }, [onHidden])

  useEffect(() => {
    onVisibleRef.current = onVisible
  }, [onVisible])

  useEffect(() => {
    if (!enabled) return

    const handler = () => {
      if (document.visibilityState === 'hidden') {
        onHiddenRef.current()
      } else if (document.visibilityState === 'visible') {
        onVisibleRef.current()
      }
    }

    document.addEventListener('visibilitychange', handler)
    return () => {
      document.removeEventListener('visibilitychange', handler)
    }
  }, [enabled])
}

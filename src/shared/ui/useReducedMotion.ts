import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof matchMedia === 'function' ? matchMedia(QUERY).matches : false,
  )
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mql = matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return reduced
}

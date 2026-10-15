import { useSyncExternalStore } from 'react'

const mobileQuery = '(max-width: 639px)'
function subscribeMobile(onChange: () => void) {
  const media = window.matchMedia(mobileQuery)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function useMobileAuth() {
  return useSyncExternalStore(subscribeMobile, () => window.matchMedia(mobileQuery).matches, () => false)
}

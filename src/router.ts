import { useSyncExternalStore } from 'react'

export type Route =
  | { page: 'home' }
  | { page: 'openings' }
  | { page: 'course'; openingId: string }
  | { page: 'train'; openingId: string; lineIdx: number; mode: 'learn' | 'practice' }
  | { page: 'drill'; openingId: string }
  | { page: 'review' }

export function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const parts = path.split('/').filter(Boolean)
  const q = new URLSearchParams(query)
  if (parts[0] === 'openings' && parts[1] && parts[2] === 'drill') return { page: 'drill', openingId: parts[1] }
  if (parts[0] === 'openings' && parts[1] && parts[2] !== undefined)
    return {
      page: 'train',
      openingId: parts[1],
      lineIdx: Number(parts[2]) || 0,
      mode: q.get('mode') === 'practice' ? 'practice' : 'learn',
    }
  if (parts[0] === 'openings' && parts[1]) return { page: 'course', openingId: parts[1] }
  if (parts[0] === 'openings') return { page: 'openings' }
  if (parts[0] === 'review') return { page: 'review' }
  return { page: 'home' }
}

export function href(r: Route): string {
  switch (r.page) {
    case 'home':
      return '#/'
    case 'openings':
      return '#/openings'
    case 'course':
      return `#/openings/${r.openingId}`
    case 'train':
      return `#/openings/${r.openingId}/${r.lineIdx}${r.mode === 'practice' ? '?mode=practice' : ''}`
    case 'drill':
      return `#/openings/${r.openingId}/drill`
    case 'review':
      return '#/review'
  }
}

export function go(r: Route) {
  location.hash = href(r)
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return parse(hash)
}

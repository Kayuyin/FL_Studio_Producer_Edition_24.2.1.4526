import type { SVGProps } from 'react'

const shapes = {
  home: 'm3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10Zm6 11v-7h6v7',
  search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m14-18.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
  'map-pin': 'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  swords: 'm14.5 17.5 3-3L6.5 3.5l-3 3L14.5 17.5Zm0 0L17 20l3-3-2.5-2.5M9.5 6.5l-3 3M3 20l5-5m8-5 5-5-2-2-5 5',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  plus: 'M12 5v14M5 12h14',
  files: 'M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3M8 3h9l4 4v9H10a2 2 0 0 1-2-2V3Zm9 0v4h4M11 11h7M11 14h7',
  handshake: 'm2 12 4-4 4 2 4-2 4 4-6 6a2 2 0 0 1-3 0l-3-3m-4-3 4 4m8-8 4-2 4 4-4 4m-8-4 3 3',
  message: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z',
  user: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4',
  menu: 'M4 6h16M4 12h16M4 18h16',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
  help: 'M9.2 9a3 3 0 0 1 5.5-1.5c1.2 1.8 0 3.1-2.1 4.2-.7.4-1 1-1 2M12 17h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  'user-plus': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6m-3-3h6',
  football: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-3-12 3-2 3 2-1 4h-4l-1-4Zm-6-.5 6 .5m6 0 6-.5M10 14l-3 5m7-5 3 5M12 8V2',
} as const

export type FutIconName = keyof typeof shapes

export function FutIcon({ name, className = '', ...props }: SVGProps<SVGSVGElement> & { name: FutIconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    width="20" height="20" aria-hidden="true" focusable="false"
    className={`ui-icon ${className}`.trim()} {...props}>
    <path d={shapes[name]} />
  </svg>
}

const iconosCategoria = {
  persona_busca_equipo: 'user',
  equipo_busca_jugadores: 'user-plus',
  equipo_busca_rival: 'swords',
  busca_cancha: 'search',
  ofrece_cancha: 'map-pin',
} as const satisfies Record<string, FutIconName>

export function FutCategoriaIcon({ categoria }: { categoria: keyof typeof iconosCategoria }) {
  return <FutIcon name={iconosCategoria[categoria]} />
}

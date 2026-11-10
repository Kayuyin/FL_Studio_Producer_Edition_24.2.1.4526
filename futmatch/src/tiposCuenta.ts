/** Tipos de cuenta seleccionables en el registro y editables desde el perfil. */
export const TIPOS_CUENTA = {
  jugador: {
    label: 'Jugador',
    description: 'Quiero buscar equipo y participar en partidos.',
  },
  equipo: {
    label: 'Equipo',
    description: 'Represento un equipo que busca jugadores o rivales.',
  },
  capitan: {
    label: 'Capitán',
    description: 'Soy el capitán o representante de un equipo.',
  },
  dueno_cancha: {
    label: 'Dueño de cancha',
    description: 'Administro una cancha deportiva.',
  },
} as const

export type TipoCuenta = keyof typeof TIPOS_CUENTA

export const TIPOS_CUENTA_IDS = Object.keys(TIPOS_CUENTA) as TipoCuenta[]

export function tipoCuentaValido(valor: unknown): valor is TipoCuenta {
  return typeof valor === 'string'
    && Object.prototype.hasOwnProperty.call(TIPOS_CUENTA, valor)
}

export function cuentaConEquipo(tipo: TipoCuenta): boolean {
  return tipo === 'equipo' || tipo === 'capitan'
}

export function cuentaConCancha(tipo: TipoCuenta): boolean {
  return tipo === 'dueno_cancha'
}

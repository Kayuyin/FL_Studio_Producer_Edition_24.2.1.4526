/** Tipos de cuenta seleccionables en el registro y editables desde el perfil. */
export const TIPOS_CUENTA = {
  jugador: {
    label: 'Jugador',
    description: 'Quiero buscar equipo y participar en partidos.',
  },
  // Compatibilidad: los perfiles Equipo creados anteriormente conservan acceso
  // a sus publicaciones, partidos, chats y plantillas hasta migrar a Capitán.
  equipo: {
    label: 'Equipo (cuenta anterior)',
    description: 'Este tipo de cuenta fue reemplazado. Cambia a Capitán desde Perfil para gestionar tu equipo.',
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

/** Únicos roles ofrecidos para crear nuevas cuentas y cambiar de rol. */
export const TIPOS_CUENTA_IDS: TipoCuenta[] = ['jugador', 'capitan', 'dueno_cancha']

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

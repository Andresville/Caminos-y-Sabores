export type EstadoEvento =
  | "SOLICITADO"
  | "PRESUPUESTADO"
  | "CONTRATADO"
  | "EN_PREPARACION"
  | "EN_EJECUCION"
  | "FINALIZADO"
  | "CANCELADO";

export const PASOS_EVENTO: { estado: EstadoEvento; etiqueta: string }[] = [
  { estado: "SOLICITADO", etiqueta: "Solicitado" },
  { estado: "PRESUPUESTADO", etiqueta: "Presupuestado" },
  { estado: "CONTRATADO", etiqueta: "Contratado" },
  { estado: "EN_PREPARACION", etiqueta: "En Preparación" },
  { estado: "EN_EJECUCION", etiqueta: "En Ejecución" },
  { estado: "FINALIZADO", etiqueta: "Finalizado" },
];

export const ETIQUETA_ESTADO: Record<EstadoEvento, string> = {
  SOLICITADO: "Solicitado",
  PRESUPUESTADO: "Presupuestado",
  CONTRATADO: "Contratado",
  EN_PREPARACION: "En Preparación",
  EN_EJECUCION: "En Ejecución",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export const COLOR_ESTADO: Record<EstadoEvento, { bg: string; fg: string }> = {
  SOLICITADO: { bg: "#E0F2F7", fg: "#0E7490" },
  PRESUPUESTADO: { bg: "#FDECD8", fg: "#C2652F" },
  CONTRATADO: { bg: "#E3F7EA", fg: "#219653" },
  EN_PREPARACION: { bg: "#E0F2F7", fg: "#0E7490" },
  EN_EJECUCION: { bg: "#EDE7F6", fg: "#5E35B1" },
  FINALIZADO: { bg: "#EDE7F6", fg: "#5E35B1" },
  CANCELADO: { bg: "#F1F1F1", fg: "#6B6B6B" },
};

/**
 * Siguiente estado disponible con un solo clic ("Siguiente estado"), sin
 * ningún paso intermedio. Contratado->En Preparación no está acá: ese
 * avance solo pasa a través de "Solicitar lista de compra" (ver
 * actions.ts::solicitarListaDeCompra), nunca con un simple cambio de
 * estado. En Preparación->En Ejecución tampoco: lo bloquea el propio
 * trigger de la base hasta que todos los insumos estén Comprados, pero
 * el botón de avanzar sigue siendo el mismo ("Pasar a ejecución").
 */
export const SIGUIENTE_ESTADO: Partial<Record<EstadoEvento, EstadoEvento>> = {
  SOLICITADO: "PRESUPUESTADO",
  PRESUPUESTADO: "CONTRATADO",
  EN_PREPARACION: "EN_EJECUCION",
  EN_EJECUCION: "FINALIZADO",
};

export const ESTADOS_CANCELABLES: EstadoEvento[] = [
  "SOLICITADO",
  "PRESUPUESTADO",
  "CONTRATADO",
  "EN_PREPARACION",
  "EN_EJECUCION",
];

export type EstadoInsumoCompra = "PENDIENTE" | "EN_CAMINO" | "COMPRADO";

export const OPCIONES_ESTADO_INSUMO: { value: EstadoInsumoCompra; label: string }[] = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_CAMINO", label: "En camino" },
  { value: "COMPRADO", label: "Comprado" },
];

export function etiquetaEstadoInsumo(valor: EstadoInsumoCompra): string {
  return OPCIONES_ESTADO_INSUMO.find((o) => o.value === valor)?.label ?? valor;
}

export const COLOR_ESTADO_INSUMO: Record<EstadoInsumoCompra, { bg: string; fg: string }> = {
  PENDIENTE: { bg: "#FDECD8", fg: "#C2652F" },
  EN_CAMINO: { bg: "#FEF3C7", fg: "#B45309" },
  COMPRADO: { bg: "#E3F7EA", fg: "#219653" },
};

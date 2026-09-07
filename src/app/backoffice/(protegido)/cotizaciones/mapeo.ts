export type EstadoCotizacion =
  | "EMITIDA"
  | "EN_NEGOCIACION"
  | "CONFIRMADA"
  | "RECHAZADA"
  | "VENCIDA"
  | "EJECUTADA";

export const ETIQUETA_ESTADO: Record<EstadoCotizacion, string> = {
  EMITIDA: "Emitida",
  EN_NEGOCIACION: "En negociación",
  CONFIRMADA: "Confirmada",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
  EJECUTADA: "Ejecutada",
};

export const COLOR_ESTADO: Record<
  EstadoCotizacion,
  "info" | "warning" | "success" | "error" | "default"
> = {
  EMITIDA: "info",
  EN_NEGOCIACION: "warning",
  CONFIRMADA: "success",
  RECHAZADA: "error",
  VENCIDA: "default",
  EJECUTADA: "success",
};

/**
 * Transiciones que un usuario puede disparar manualmente desde la UI,
 * siguiendo el diagrama de estados del documento. EMITIDA -> VENCIDA
 * queda deliberadamente afuera: en el diagrama es automática (por
 * vencimiento de fecha), no una acción manual; la base de datos la
 * permite para cuando exista ese proceso programado, pero acá no se
 * ofrece como botón.
 */
export const TRANSICIONES_MANUALES: Record<EstadoCotizacion, { estado: EstadoCotizacion; etiqueta: string }[]> = {
  EMITIDA: [{ estado: "EN_NEGOCIACION", etiqueta: "Iniciar negociación" }],
  EN_NEGOCIACION: [
    { estado: "CONFIRMADA", etiqueta: "Confirmar" },
    { estado: "RECHAZADA", etiqueta: "Rechazar" },
  ],
  VENCIDA: [{ estado: "RECHAZADA", etiqueta: "Descartar" }],
  CONFIRMADA: [{ estado: "EJECUTADA", etiqueta: "Marcar como ejecutada" }],
  RECHAZADA: [],
  EJECUTADA: [],
};

export type EstadoCotizacion =
  | "SOLICITADO"
  | "APROBADO"
  | "EN_NEGOCIACION"
  | "FINALIZADO"
  | "CANCELADO"
  | "RECHAZADA"
  | "VENCIDA";

export const ETIQUETA_ESTADO: Record<EstadoCotizacion, string> = {
  SOLICITADO: "Solicitado",
  APROBADO: "Aprobado por el cliente",
  EN_NEGOCIACION: "En negociación",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
};

export const COLOR_ESTADO: Record<
  EstadoCotizacion,
  "info" | "warning" | "success" | "error" | "default" | "secondary"
> = {
  SOLICITADO: "warning",
  APROBADO: "success",
  EN_NEGOCIACION: "secondary",
  FINALIZADO: "success",
  CANCELADO: "default",
  RECHAZADA: "error",
  VENCIDA: "default",
};

/**
 * Transiciones manuales disponibles para Comercial/Administrador desde
 * el backoffice. SOLICITADO no tiene ninguna: ahí el único que decide
 * es el cliente (aceptar/rechazar desde su cuenta), Comercial solo
 * puede ajustar cantidades/descuento y reenviar (ver
 * ajustarSolicitud), no cambiar el estado directamente. VENCIDA no
 * tiene disparador manual: es automática por fecha (todavía sin un
 * proceso programado que la aplique).
 */
export const TRANSICIONES_MANUALES: Record<EstadoCotizacion, { estado: EstadoCotizacion; etiqueta: string }[]> = {
  SOLICITADO: [],
  APROBADO: [
    { estado: "EN_NEGOCIACION", etiqueta: "Pasar a negociación" },
    { estado: "FINALIZADO", etiqueta: "Aprobar y enviar a Eventos" },
    { estado: "CANCELADO", etiqueta: "Cancelar" },
  ],
  EN_NEGOCIACION: [
    { estado: "FINALIZADO", etiqueta: "Convertir en evento" },
    { estado: "CANCELADO", etiqueta: "Cancelar" },
  ],
  VENCIDA: [{ estado: "RECHAZADA", etiqueta: "Descartar" }],
  FINALIZADO: [],
  CANCELADO: [],
  RECHAZADA: [],
};

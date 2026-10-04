export type EstadoCotizacion =
  | "PENDIENTE"
  | "SOLICITADO"
  | "EN_NEGOCIACION"
  | "FINALIZADO"
  | "CANCELADO"
  | "RECHAZADA"
  | "VENCIDA";

/**
 * Pendiente es el presupuesto recién estimado (apenas el cliente ve el
 * total en el carrito) — todavía no es un pedido real, así que nunca
 * llega al backoffice (ver filtro en page.tsx). Si el cliente confirma
 * ("Solicitar contacto comercial"), recién ahí pasa a Solicitado y
 * aparece para Comercial.
 */
export const ETIQUETA_ESTADO: Record<EstadoCotizacion, string> = {
  PENDIENTE: "Pendiente",
  SOLICITADO: "Solicitado",
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
  PENDIENTE: "warning",
  SOLICITADO: "success",
  EN_NEGOCIACION: "secondary",
  FINALIZADO: "success",
  CANCELADO: "default",
  RECHAZADA: "error",
  VENCIDA: "default",
};

/**
 * Transiciones manuales disponibles para Comercial/Administrador desde
 * el backoffice. Pendiente y Rechazada no tienen ninguna: ni siquiera
 * llegan a verse en el backoffice (ahí el único que decide es el
 * cliente, confirmando o rechazando desde su cuenta). En Solicitado,
 * Comercial solo puede pasar a negociación o cancelar — ya no ajusta
 * cantidades ni descuento desde acá (eso se discute en la negociación).
 * VENCIDA no tiene disparador manual: es automática por fecha (todavía
 * sin un proceso programado que la aplique).
 */
export const TRANSICIONES_MANUALES: Record<EstadoCotizacion, { estado: EstadoCotizacion; etiqueta: string }[]> = {
  PENDIENTE: [],
  SOLICITADO: [
    { estado: "EN_NEGOCIACION", etiqueta: "Pasar a negociación" },
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

export const ENTIDADES_AUDITADAS = [
  { value: "materia_prima", label: "Insumos" },
  { value: "receta", label: "Recetas" },
  { value: "menu", label: "Menús" },
  { value: "servicio_adicional", label: "Servicios adicionales" },
  { value: "usuario", label: "Usuarios" },
  { value: "parametro_sistema", label: "Parámetros del sistema" },
  { value: "cotizacion", label: "Cotizaciones" },
] as const;

export function etiquetaEntidad(valor: string): string {
  return ENTIDADES_AUDITADAS.find((e) => e.value === valor)?.label ?? valor;
}

export const ETIQUETA_ACCION: Record<string, string> = {
  INSERT: "Alta",
  UPDATE: "Modificación",
  DELETE: "Baja",
};

export const COLOR_ACCION: Record<string, "success" | "info" | "error" | "default"> = {
  INSERT: "success",
  UPDATE: "info",
  DELETE: "error",
};

export const TIPOS_COBRO = [
  { value: "FIJO", label: "Fijo por evento" },
  { value: "POR_PERSONA", label: "Por persona" },
] as const;

export function etiquetaTipoCobro(valor: string): string {
  return TIPOS_COBRO.find((t) => t.value === valor)?.label ?? valor;
}

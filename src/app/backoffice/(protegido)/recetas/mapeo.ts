import Decimal from "decimal.js";
import type { Insumo, Magnitud, UnidadMedida } from "@/domain/costeo";

export interface InsumoCatalogo {
  id_materia_prima: number;
  nombre: string;
  costo_unitario: number;
  densidad_g_ml: number | null;
  id_unidad_compra: number;
}

export interface UnidadCatalogo {
  id_unidad: number;
  nombre: string;
  simbolo: string;
  magnitud: Magnitud;
  factor_a_base: number;
}

export function unidadDominio(unidad: UnidadCatalogo): UnidadMedida {
  return {
    simbolo: unidad.simbolo,
    magnitud: unidad.magnitud,
    factorABase: new Decimal(unidad.factor_a_base),
  };
}

/** Devuelve null si la unidad de compra del insumo no está en el catálogo recibido. */
export function insumoDominio(insumo: InsumoCatalogo, unidades: UnidadCatalogo[]): Insumo | null {
  const unidadCompra = unidades.find((u) => u.id_unidad === insumo.id_unidad_compra);
  if (!unidadCompra) return null;

  return {
    nombre: insumo.nombre,
    costoUnitario: new Decimal(insumo.costo_unitario),
    unidadCompra: unidadDominio(unidadCompra),
    densidadGml: insumo.densidad_g_ml != null ? new Decimal(insumo.densidad_g_ml) : undefined,
  };
}

export const TIPOS_PLATO = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "PRINCIPAL", label: "Plato principal" },
  { value: "POSTRE", label: "Postre" },
  { value: "MESA_DULCE", label: "Mesa dulce" },
  { value: "RECEPCION", label: "Recepción" },
] as const;

export function etiquetaTipoPlato(valor: string): string {
  return TIPOS_PLATO.find((t) => t.value === valor)?.label ?? valor;
}

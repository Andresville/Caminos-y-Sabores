import Decimal from "decimal.js";

/**
 * Tipos del dominio de costeo. Este módulo no depende de la base de
 * datos, del framework web ni de ningún detalle de infraestructura:
 * solo recibe datos ya cargados en memoria y devuelve resultados.
 */

export type Magnitud = "MASA" | "VOLUMEN" | "CONTEO";

export interface UnidadMedida {
  simbolo: string;
  magnitud: Magnitud;
  factorABase: Decimal;
}

export interface Insumo {
  nombre: string;
  costoUnitario: Decimal;
  unidadCompra: UnidadMedida;
  /** Gramos por mililitro. Solo se usa si hace falta convertir entre masa y volumen. */
  densidadGml?: Decimal;
}

export interface LineaReceta {
  insumo: Insumo;
  cantidadUsada: Decimal;
  unidadReceta: UnidadMedida;
  /** Porcentaje entre 0 (inclusive) y 100 (exclusive). */
  porcentajeMerma: Decimal;
}

export interface ResultadoLinea {
  cantidadBruta: Decimal;
  costoLinea: Decimal;
}

export interface Receta {
  cantidadPorciones: number;
  lineas: LineaReceta[];
}

export interface ResultadoReceta {
  costoTotal: Decimal;
  costoPorPorcion: Decimal;
}

export interface RecetaEnMenu {
  costoPorPorcion: Decimal;
  porcionesPorPax: Decimal;
}

export type TipoCobroAdicional = "FIJO" | "POR_PERSONA";

export interface AdicionalEvento {
  tipoCobro: TipoCobroAdicional;
  costoUnitario: Decimal;
}

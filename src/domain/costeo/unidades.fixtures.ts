import Decimal from "decimal.js";
import type { UnidadMedida } from "./tipos";

/** Unidades de referencia para los tests. */
export const GRAMO: UnidadMedida = { simbolo: "g", magnitud: "MASA", factorABase: new Decimal(1) };
export const KILOGRAMO: UnidadMedida = { simbolo: "kg", magnitud: "MASA", factorABase: new Decimal(1000) };
export const MILILITRO: UnidadMedida = { simbolo: "ml", magnitud: "VOLUMEN", factorABase: new Decimal(1) };
export const LITRO: UnidadMedida = { simbolo: "l", magnitud: "VOLUMEN", factorABase: new Decimal(1000) };
export const UNIDAD: UnidadMedida = { simbolo: "un", magnitud: "CONTEO", factorABase: new Decimal(1) };

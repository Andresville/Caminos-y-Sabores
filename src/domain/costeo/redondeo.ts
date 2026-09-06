import Decimal from "decimal.js";

/**
 * Redondeo comercial (RN-13): al múltiplo indicado más cercano. Se
 * aplica únicamente al importe final, nunca a los cálculos
 * intermedios de la cadena de costeo/cotización (sección 9.7).
 */
export function redondearComercial(importe: Decimal, multiplo: Decimal): Decimal {
  return importe.dividedBy(multiplo).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).times(multiplo);
}

/** Redondeo a dos decimales para presentar un importe monetario. */
export function redondearMoneda(importe: Decimal): Decimal {
  return importe.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

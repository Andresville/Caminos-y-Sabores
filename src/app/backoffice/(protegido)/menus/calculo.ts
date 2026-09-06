import Decimal from "decimal.js";
import {
  costoMenuPorInvitado,
  costoTotalEvento,
  precioFinal as calcularPrecioFinal,
  precioNeto as calcularPrecioNeto,
  type RecetaEnMenu,
} from "@/domain/costeo";

export interface ParametrosComerciales {
  gastosGeneralesPct: number;
  ivaPorcentaje: number;
  redondeoPrecioFinal: number;
}

/** Costo y precio público de un menú, reusando el motor de dominio ya probado. */
export function calcularPrecioMenu(
  recetas: RecetaEnMenu[],
  coeficienteVenta: number,
  parametros: ParametrosComerciales,
) {
  const costoPorPax = costoMenuPorInvitado(recetas);
  const costoTotal = costoTotalEvento(costoPorPax, new Decimal(parametros.gastosGeneralesPct));
  const neto = calcularPrecioNeto(costoTotal, new Decimal(coeficienteVenta));
  const final = calcularPrecioFinal(
    neto,
    new Decimal(parametros.ivaPorcentaje),
    new Decimal(parametros.redondeoPrecioFinal),
  );

  return { costoPorPax, costoTotal, precioNeto: neto, precioFinal: final };
}

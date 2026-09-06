import Decimal from "decimal.js";
import type { AdicionalEvento, RecetaEnMenu } from "./tipos";
import { redondearComercial } from "./redondeo";

/** RN-08: el costo del menú por invitado pondera las porciones de cada receta. */
export function costoMenuPorInvitado(recetas: RecetaEnMenu[]): Decimal {
  return recetas.reduce(
    (acumulado, r) => acumulado.plus(r.costoPorPorcion.times(r.porcionesPorPax)),
    new Decimal(0),
  );
}

/** RN-14: la dotación de personal se calcula, no se elige. Siempre redondea hacia arriba. */
export function calcularDotacionMozos(pax: Decimal, paxPorMozo: Decimal): Decimal {
  return pax.dividedBy(paxPorMozo).toDecimalPlaces(0, Decimal.ROUND_CEIL);
}

export function costoDeAdicional(adicional: AdicionalEvento, pax: Decimal): Decimal {
  return adicional.tipoCobro === "FIJO" ? adicional.costoUnitario : adicional.costoUnitario.times(pax);
}

/** RN-09: costo directo = menú + adicionales + dotación de personal. */
export function costoDirectoEvento(params: {
  costoMenuPorInvitado: Decimal;
  pax: Decimal;
  adicionales: AdicionalEvento[];
  paxPorMozo: Decimal;
  costoMozoEvento: Decimal;
}): Decimal {
  const costoMenu = params.costoMenuPorInvitado.times(params.pax);

  const costoAdicionales = params.adicionales.reduce(
    (acumulado, a) => acumulado.plus(costoDeAdicional(a, params.pax)),
    new Decimal(0),
  );

  const cantidadMozos = calcularDotacionMozos(params.pax, params.paxPorMozo);
  const costoMozos = cantidadMozos.times(params.costoMozoEvento);

  return costoMenu.plus(costoAdicionales).plus(costoMozos);
}

/** RN-10: sobre el costo directo se aplican los gastos generales. */
export function costoTotalEvento(costoDirecto: Decimal, gastosGeneralesPct: Decimal): Decimal {
  return costoDirecto.times(new Decimal(1).plus(gastosGeneralesPct.dividedBy(100)));
}

/** RN-11: el precio neto surge de aplicar el coeficiente de venta al costo total. */
export function precioNeto(costoTotal: Decimal, coeficienteVenta: Decimal): Decimal {
  return costoTotal.times(coeficienteVenta);
}

/** RN-12 y RN-13: IVA sobre el precio neto, redondeado comercialmente al final. */
export function precioFinal(
  precioNetoValor: Decimal,
  ivaPorcentaje: Decimal,
  multiploRedondeo: Decimal,
): Decimal {
  const conIva = precioNetoValor.times(new Decimal(1).plus(ivaPorcentaje.dividedBy(100)));
  return redondearComercial(conIva, multiploRedondeo);
}

/**
 * Margen sobre la venta (sección 6.2): no debe confundirse con el
 * recargo del coeficiente. Un coeficiente de 1,45 equivale a un
 * margen del 31 % sobre la venta, no al 45 %.
 */
export function margenSobreVenta(coeficienteVenta: Decimal): Decimal {
  return new Decimal(1).minus(new Decimal(1).dividedBy(coeficienteVenta));
}

import Decimal from "decimal.js";
import type { Insumo, LineaReceta, Receta, ResultadoLinea, ResultadoReceta } from "./tipos";
import { convertirACantidadBase } from "./conversion";
import { ErrorCantidadInvalida, ErrorMermaInvalida } from "./errores";

/** El costo base es siempre el costo por unidad base del insumo. */
export function costoBaseInsumo(insumo: Insumo): Decimal {
  if (insumo.costoUnitario.lte(0)) {
    throw new ErrorCantidadInvalida(
      `El costo unitario de "${insumo.nombre}" debe ser mayor a cero.`,
    );
  }
  return insumo.costoUnitario.dividedBy(insumo.unidadCompra.factorABase);
}

/**
 * Costea una línea de receta. No conoce menús, cotizaciones ni
 * impuestos: eso es lo que permite cubrirla con pruebas unitarias
 * rápidas, sin base de datos ni interfaz.
 */
export function costearLinea(linea: LineaReceta): ResultadoLinea {
  if (linea.cantidadUsada.lte(0)) {
    throw new ErrorCantidadInvalida("La cantidad usada debe ser mayor a cero.");
  }
  if (linea.porcentajeMerma.lt(0) || linea.porcentajeMerma.gte(100)) {
    throw new ErrorMermaInvalida(linea.porcentajeMerma.toString());
  }

  const cantidadBase = convertirACantidadBase(linea.cantidadUsada, linea.unidadReceta, linea.insumo);
  const cantidadBruta = cantidadBase.dividedBy(new Decimal(1).minus(linea.porcentajeMerma.dividedBy(100)));
  const costoLinea = cantidadBruta.times(costoBaseInsumo(linea.insumo));

  return { cantidadBruta, costoLinea };
}

/**
 * Costea una receta completa. Suma los costos de línea sin redondear
 * en cada paso y solo divide por la cantidad de porciones al final.
 */
export function costearReceta(receta: Receta): ResultadoReceta {
  if (receta.cantidadPorciones <= 0) {
    throw new ErrorCantidadInvalida("La cantidad de porciones debe ser mayor a cero.");
  }

  const costoTotal = receta.lineas.reduce(
    (acumulado, linea) => acumulado.plus(costearLinea(linea).costoLinea),
    new Decimal(0),
  );

  const costoPorPorcion = costoTotal.dividedBy(receta.cantidadPorciones);

  return { costoTotal, costoPorPorcion };
}

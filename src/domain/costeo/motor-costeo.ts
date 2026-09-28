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
 * rápidas, sin base de datos ni interfaz. La merma ya no se carga por
 * línea: es un porcentaje único sobre toda la receta (ver costearReceta).
 */
export function costearLinea(linea: LineaReceta): ResultadoLinea {
  if (linea.cantidadUsada.lte(0)) {
    throw new ErrorCantidadInvalida("La cantidad usada debe ser mayor a cero.");
  }

  const cantidadBase = convertirACantidadBase(linea.cantidadUsada, linea.unidadReceta, linea.insumo);
  const costoLinea = cantidadBase.times(costoBaseInsumo(linea.insumo));

  return { costoLinea };
}

/**
 * Costea una receta completa: suma el costo de insumos y le aplica la
 * merma y la mano de obra de la receta (ambas, un único porcentaje
 * sobre el costo de insumos, no por línea). Solo divide por la
 * cantidad de porciones al final.
 */
export function costearReceta(receta: Receta): ResultadoReceta {
  if (receta.cantidadPorciones <= 0) {
    throw new ErrorCantidadInvalida("La cantidad de porciones debe ser mayor a cero.");
  }
  if (receta.mermaPct.lt(0) || receta.mermaPct.gte(100)) {
    throw new ErrorMermaInvalida(receta.mermaPct.toString());
  }
  if (receta.manoObraPct.lt(0)) {
    throw new ErrorCantidadInvalida("El porcentaje de mano de obra no puede ser negativo.");
  }

  const costoInsumos = receta.lineas.reduce(
    (acumulado, linea) => acumulado.plus(costearLinea(linea).costoLinea),
    new Decimal(0),
  );

  const mermaMonto = costoInsumos.times(receta.mermaPct.dividedBy(100));
  const manoObraMonto = costoInsumos.times(receta.manoObraPct.dividedBy(100));
  const costoTotal = costoInsumos.plus(mermaMonto).plus(manoObraMonto);
  const costoPorPorcion = costoTotal.dividedBy(receta.cantidadPorciones);

  return { costoInsumos, mermaMonto, manoObraMonto, costoTotal, costoPorPorcion };
}

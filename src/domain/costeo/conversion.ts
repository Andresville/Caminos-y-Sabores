import Decimal from "decimal.js";
import type { Insumo, UnidadMedida } from "./tipos";
import { ErrorUnidadesIncompatibles } from "./errores";

/**
 * Convierte una cantidad declarada en una receta a la unidad base de la
 * MAGNITUD DEL INSUMO, para que pueda combinarse con el costo base del
 * insumo (que también está expresado en esa unidad base).
 *
 * Solo se convierte entre unidades de la misma magnitud, salvo que el
 * insumo tenga densidad declarada, en cuyo caso se admite la
 * conversión masa–volumen (por ejemplo, crema medida en mililitros
 * por el Chef pero facturada por kilogramo por el proveedor).
 */
export function convertirACantidadBase(
  cantidad: Decimal,
  unidadDeclarada: UnidadMedida,
  insumo: Insumo,
): Decimal {
  const magnitudInsumo = insumo.unidadCompra.magnitud;

  if (unidadDeclarada.magnitud === magnitudInsumo) {
    return cantidad.times(unidadDeclarada.factorABase);
  }

  if (insumo.densidadGml == null) {
    throw new ErrorUnidadesIncompatibles(insumo.nombre, magnitudInsumo, unidadDeclarada.magnitud);
  }

  const cantidadEnBaseDeclarada = cantidad.times(unidadDeclarada.factorABase);

  if (magnitudInsumo === "MASA" && unidadDeclarada.magnitud === "VOLUMEN") {
    // cantidadEnBaseDeclarada está en mililitros -> pasar a gramos.
    return cantidadEnBaseDeclarada.times(insumo.densidadGml);
  }

  if (magnitudInsumo === "VOLUMEN" && unidadDeclarada.magnitud === "MASA") {
    // cantidadEnBaseDeclarada está en gramos -> pasar a mililitros.
    return cantidadEnBaseDeclarada.dividedBy(insumo.densidadGml);
  }

  // CONTEO nunca es convertible con MASA o VOLUMEN, ni con densidad.
  throw new ErrorUnidadesIncompatibles(insumo.nombre, magnitudInsumo, unidadDeclarada.magnitud);
}

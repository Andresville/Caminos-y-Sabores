import Decimal from "decimal.js";
import { precioFinal, precioNeto, costoTotalEvento } from "@/domain/costeo";

/**
 * Orquesta el motor de dominio para el carrito del portal cliente:
 * cada línea (menú, plato o adicional) se costea con su PROPIO
 * coeficiente de venta, los gastos generales se aplican línea a línea
 * con el mismo porcentaje global (matemáticamente equivalente a
 * aplicarlos una sola vez sobre el agregado) y el IVA y el redondeo
 * comercial se aplican una única vez sobre el subtotal neto. Nunca
 * calcula ni expone costo ni coeficiente: solo devuelve el desglose
 * público (descripción, cantidad, precio unitario neto, subtotal) más
 * los totales.
 */

export interface ParametrosComerciales {
  gastosGeneralesPct: number;
  ivaPorcentaje: number;
  redondeoPrecioFinal: number;
}

export type TipoItemCarrito = "MENU" | "RECETA" | "ADICIONAL";

function netoLinea(costoRawPorUnidad: Decimal, coeficienteVenta: number, gastosGeneralesPct: number): Decimal {
  const costoConGastos = costoTotalEvento(costoRawPorUnidad, new Decimal(gastosGeneralesPct));
  return precioNeto(costoConGastos, new Decimal(coeficienteVenta));
}

function redondearMoneda(valor: Decimal): number {
  return valor.toDecimalPlaces(2).toNumber();
}

/** Precio público unitario de un ítem (menú por persona, plato por porción, adicional fijo o por persona), para mostrarlo suelto en el catálogo antes de armar el carrito completo. */
export function calcularPrecioPublico(
  item: { coeficienteVenta: number; costoUnitario: number },
  parametros: ParametrosComerciales,
): number {
  return redondearMoneda(netoLinea(new Decimal(item.costoUnitario), item.coeficienteVenta, parametros.gastosGeneralesPct));
}

export interface LineaCarrito {
  tipoItem: TipoItemCarrito;
  idReferencia: number;
  descripcion: string;
  cantidad: number;
  coeficienteVenta: number;
  /** Costo crudo por unidad de venta: costoMenuPorInvitado para MENU, costo_por_porcion para RECETA, costo_actual para ADICIONAL. */
  costoUnitario: Decimal;
}

export interface LineaDesglose {
  tipoItem: TipoItemCarrito;
  idReferencia: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface DesgloseCarrito {
  lineas: LineaDesglose[];
  subtotalNeto: number;
  montoIva: number;
  montoTotal: number;
}

export function calcularDesgloseCarrito(lineas: LineaCarrito[], parametros: ParametrosComerciales): DesgloseCarrito {
  const lineasCalculadas: LineaDesglose[] = lineas.map((linea) => {
    const netoUnitario = netoLinea(linea.costoUnitario, linea.coeficienteVenta, parametros.gastosGeneralesPct);
    return {
      tipoItem: linea.tipoItem,
      idReferencia: linea.idReferencia,
      descripcion: linea.descripcion,
      cantidad: linea.cantidad,
      precioUnitario: redondearMoneda(netoUnitario),
      subtotal: redondearMoneda(netoUnitario.times(linea.cantidad)),
    };
  });

  const subtotalNeto = lineasCalculadas.reduce((acumulado, linea) => acumulado.plus(linea.subtotal), new Decimal(0));
  const montoIva = subtotalNeto.times(new Decimal(parametros.ivaPorcentaje).dividedBy(100));
  const montoTotal = precioFinal(
    subtotalNeto,
    new Decimal(parametros.ivaPorcentaje),
    new Decimal(parametros.redondeoPrecioFinal),
  );

  return {
    lineas: lineasCalculadas,
    subtotalNeto: redondearMoneda(subtotalNeto),
    montoIva: redondearMoneda(montoIva),
    montoTotal: montoTotal.toNumber(),
  };
}

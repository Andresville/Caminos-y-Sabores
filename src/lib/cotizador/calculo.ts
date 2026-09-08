import Decimal from "decimal.js";
import {
  calcularDotacionMozos,
  costoMenuPorInvitado,
  costoTotalEvento,
  precioFinal,
  precioNeto,
  type RecetaEnMenu,
} from "@/domain/costeo";

/**
 * Orquesta el motor de dominio para el portal público: cada concepto
 * (menú, cada adicional, mozos) se costea con su PROPIO coeficiente de
 * venta, los gastos generales se aplican línea a línea con el mismo
 * porcentaje global (matemáticamente equivalente a aplicarlos una sola
 * vez sobre el agregado) y el IVA y el redondeo comercial se aplican
 * una única vez sobre el subtotal neto. Nunca calcula ni expone costo
 * ni coeficiente: solo devuelve el desglose público (descripción,
 * cantidad, precio unitario neto, subtotal) más los totales.
 */

export interface ParametrosComerciales {
  gastosGeneralesPct: number;
  ivaPorcentaje: number;
  redondeoPrecioFinal: number;
  paxPorMozo: number;
  costoMozoEvento: number;
  coeficienteVentaDefecto: number;
}

export interface MenuSeleccionado {
  idMenu: number;
  nombreMenu: string;
  coeficienteVenta: number;
  recetas: RecetaEnMenu[];
}

export type TipoCobroAdicional = "FIJO" | "POR_PERSONA";

export interface AdicionalSeleccionado {
  idAdicional: number;
  nombreServicio: string;
  coeficienteVenta: number;
  tipoCobro: TipoCobroAdicional;
  costoUnitario: number;
}

export type TipoItemPublico = "MENU" | "ADICIONAL" | "PERSONAL";

export interface LineaPublica {
  tipoItem: TipoItemPublico;
  idReferencia: number | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface DesglosePublico {
  lineas: LineaPublica[];
  cantidadMozos: number;
  subtotalNeto: number;
  montoIva: number;
  montoTotal: number;
}

function netoLinea(costoRawPorUnidad: Decimal, coeficienteVenta: number, gastosGeneralesPct: number): Decimal {
  const costoConGastos = costoTotalEvento(costoRawPorUnidad, new Decimal(gastosGeneralesPct));
  return precioNeto(costoConGastos, new Decimal(coeficienteVenta));
}

function redondearMoneda(valor: Decimal): number {
  return valor.toDecimalPlaces(2).toNumber();
}

/** Precio unitario neto de un adicional (por evento si es fijo, por invitado si es por persona), para mostrarlo suelto en el catálogo antes de armar el desglose completo. */
export function calcularPrecioAdicional(
  adicional: Pick<AdicionalSeleccionado, "coeficienteVenta" | "costoUnitario">,
  parametros: ParametrosComerciales,
): number {
  return redondearMoneda(
    netoLinea(new Decimal(adicional.costoUnitario), adicional.coeficienteVenta, parametros.gastosGeneralesPct),
  );
}

export function calcularDesglosePublico(
  pax: number,
  menu: MenuSeleccionado | null,
  adicionales: AdicionalSeleccionado[],
  parametros: ParametrosComerciales,
): DesglosePublico {
  const lineas: LineaPublica[] = [];

  if (menu) {
    const costoMenuPax = costoMenuPorInvitado(menu.recetas);
    const netoUnitario = netoLinea(costoMenuPax, menu.coeficienteVenta, parametros.gastosGeneralesPct);
    lineas.push({
      tipoItem: "MENU",
      idReferencia: menu.idMenu,
      descripcion: menu.nombreMenu,
      cantidad: pax,
      precioUnitario: redondearMoneda(netoUnitario),
      subtotal: redondearMoneda(netoUnitario.times(pax)),
    });
  }

  for (const adicional of adicionales) {
    const cantidad = adicional.tipoCobro === "POR_PERSONA" ? pax : 1;
    const netoUnitario = netoLinea(
      new Decimal(adicional.costoUnitario),
      adicional.coeficienteVenta,
      parametros.gastosGeneralesPct,
    );
    lineas.push({
      tipoItem: "ADICIONAL",
      idReferencia: adicional.idAdicional,
      descripcion: adicional.nombreServicio,
      cantidad,
      precioUnitario: redondearMoneda(netoUnitario),
      subtotal: redondearMoneda(netoUnitario.times(cantidad)),
    });
  }

  const cantidadMozos = calcularDotacionMozos(new Decimal(pax), new Decimal(parametros.paxPorMozo)).toNumber();
  const netoUnitarioMozo = netoLinea(
    new Decimal(parametros.costoMozoEvento),
    parametros.coeficienteVentaDefecto,
    parametros.gastosGeneralesPct,
  );
  lineas.push({
    tipoItem: "PERSONAL",
    idReferencia: null,
    descripcion: "Servicio de mozos",
    cantidad: cantidadMozos,
    precioUnitario: redondearMoneda(netoUnitarioMozo),
    subtotal: redondearMoneda(netoUnitarioMozo.times(cantidadMozos)),
  });

  const subtotalNeto = lineas.reduce((acumulado, linea) => acumulado.plus(linea.subtotal), new Decimal(0));
  const montoIva = subtotalNeto.times(new Decimal(parametros.ivaPorcentaje).dividedBy(100));
  const montoTotal = precioFinal(
    subtotalNeto,
    new Decimal(parametros.ivaPorcentaje),
    new Decimal(parametros.redondeoPrecioFinal),
  );

  return {
    lineas,
    cantidadMozos,
    subtotalNeto: redondearMoneda(subtotalNeto),
    montoIva: redondearMoneda(montoIva),
    montoTotal: montoTotal.toNumber(),
  };
}

import { describe, expect, test } from "vitest";
import Decimal from "decimal.js";
import { calcularDesglosePublico, type AdicionalSeleccionado, type MenuSeleccionado } from "./calculo";

// Mismo evento de 120 invitados documentado en motor-cotizacion.test.ts,
// reproduciendo también los importes que muestran las pantallas del
// portal público: línea a línea, subtotal neto, IVA y total final
// coinciden con esas capturas.
function menuPremium(): MenuSeleccionado {
  return {
    idMenu: 1,
    nombreMenu: "Menú Premium",
    coeficienteVenta: 1.45,
    recetas: [
      { costoPorPorcion: new Decimal(2150), porcionesPorPax: new Decimal(1) },
      { costoPorPorcion: new Decimal(8704.8), porcionesPorPax: new Decimal(1) },
      { costoPorPorcion: new Decimal(1890), porcionesPorPax: new Decimal(1) },
      { costoPorPorcion: new Decimal(620), porcionesPorPax: new Decimal(3) },
    ],
  };
}

function adicionalesEvento(): AdicionalSeleccionado[] {
  return [
    { idAdicional: 1, nombreServicio: "DJ y sonido profesional", coeficienteVenta: 1.45, tipoCobro: "FIJO", costoUnitario: 320000 },
    { idAdicional: 2, nombreServicio: "Barra libre (5 hs)", coeficienteVenta: 1.45, tipoCobro: "POR_PERSONA", costoUnitario: 4500 },
    { idAdicional: 3, nombreServicio: "Mantelería premium", coeficienteVenta: 1.45, tipoCobro: "POR_PERSONA", costoUnitario: 1800 },
  ];
}

const parametros = {
  gastosGeneralesPct: 12,
  ivaPorcentaje: 21,
  redondeoPrecioFinal: 100,
  paxPorMozo: 15,
  costoMozoEvento: 85000,
  coeficienteVentaDefecto: 1.45,
};

describe("calcularDesglosePublico", () => {
  test("reproduce exactamente los importes del evento de 120 invitados de los wireframes", () => {
    const desglose = calcularDesglosePublico(120, menuPremium(), adicionalesEvento(), parametros);

    expect(desglose.lineas).toEqual([
      { tipoItem: "MENU", idReferencia: 1, descripcion: "Menú Premium", cantidad: 120, precioUnitario: 23718.2, subtotal: 2846183.42 },
      { tipoItem: "ADICIONAL", idReferencia: 1, descripcion: "DJ y sonido profesional", cantidad: 1, precioUnitario: 519680, subtotal: 519680 },
      { tipoItem: "ADICIONAL", idReferencia: 2, descripcion: "Barra libre (5 hs)", cantidad: 120, precioUnitario: 7308, subtotal: 876960 },
      { tipoItem: "ADICIONAL", idReferencia: 3, descripcion: "Mantelería premium", cantidad: 120, precioUnitario: 2923.2, subtotal: 350784 },
      { tipoItem: "PERSONAL", idReferencia: null, descripcion: "Servicio de mozos", cantidad: 8, precioUnitario: 138040, subtotal: 1104320 },
    ]);
    expect(desglose.cantidadMozos).toBe(8);
    expect(desglose.subtotalNeto).toBe(5697927.42);
    expect(desglose.montoTotal).toBe(6894500);
  });

  test("sin menú ni adicionales, solo cotiza la dotación de mozos", () => {
    const desglose = calcularDesglosePublico(30, null, [], parametros);

    expect(desglose.lineas).toHaveLength(1);
    expect(desglose.cantidadMozos).toBe(2);
  });

  test("un adicional fijo no escala con la cantidad de invitados", () => {
    const adicional: AdicionalSeleccionado = {
      idAdicional: 4,
      nombreServicio: "Ambientación floral",
      coeficienteVenta: 1.45,
      tipoCobro: "FIJO",
      costoUnitario: 300000,
    };

    const con50 = calcularDesglosePublico(50, null, [adicional], parametros);
    const con200 = calcularDesglosePublico(200, null, [adicional], parametros);

    expect(con50.lineas[0].subtotal).toBe(con200.lineas[0].subtotal);
  });
});

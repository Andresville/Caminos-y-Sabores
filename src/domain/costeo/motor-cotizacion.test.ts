import { describe, expect, test } from "vitest";
import Decimal from "decimal.js";
import {
  calcularDotacionMozos,
  costoDeAdicional,
  costoDirectoEvento,
  costoMenuPorInvitado,
  costoTotalEvento,
  margenSobreVenta,
  precioFinal,
  precioNeto,
} from "./motor-cotizacion";
import { redondearComercial } from "./redondeo";
import type { AdicionalEvento, RecetaEnMenu } from "./tipos";

// Fixture: "Menú Premium" de la sección 9.5.
function recetasMenuPremium(): RecetaEnMenu[] {
  return [
    { costoPorPorcion: new Decimal(2150), porcionesPorPax: new Decimal(1) }, // Entrada
    { costoPorPorcion: new Decimal(8704.8), porcionesPorPax: new Decimal(1) }, // Principal
    { costoPorPorcion: new Decimal(1890), porcionesPorPax: new Decimal(1) }, // Postre
    { costoPorPorcion: new Decimal(620), porcionesPorPax: new Decimal(3) }, // Mesa dulce
  ];
}

describe("costoMenuPorInvitado", () => {
  // CP-11: Menú Premium con receta de mesa dulce en tres porciones por invitado.
  test("CP-11: la mesa dulce aporta tres veces su costo por porción", () => {
    const costo = costoMenuPorInvitado(recetasMenuPremium());

    expect(costo.toFixed(2)).toBe("14604.80");
  });
});

describe("cadena de precio público (sección 9.5)", () => {
  // CP-12: Cálculo del precio público a partir del costo del menú.
  test("CP-12: precio final por invitado del Menú Premium", () => {
    const costoMenu = costoMenuPorInvitado(recetasMenuPremium());
    const costoTotal = costoTotalEvento(costoMenu, new Decimal(12));
    const neto = precioNeto(costoTotal, new Decimal(1.45));
    const final = precioFinal(neto, new Decimal(21), new Decimal(100));

    expect(final.toFixed(2)).toBe("28700.00");
  });
});

describe("evento completo de 120 invitados (sección 9.6)", () => {
  function adicionalesEvento(): AdicionalEvento[] {
    return [
      { tipoCobro: "FIJO", costoUnitario: new Decimal(320000) }, // DJ y sonido
      { tipoCobro: "POR_PERSONA", costoUnitario: new Decimal(4500) }, // Barra libre
      { tipoCobro: "POR_PERSONA", costoUnitario: new Decimal(1800) }, // Mantelería premium
    ];
  }

  // CP-13: Evento de 120 invitados con Menú Premium y tres adicionales.
  test("CP-13: el total del presupuesto reproduce exactamente el ejemplo del documento", () => {
    const pax = new Decimal(120);
    const costoMenu = costoMenuPorInvitado(recetasMenuPremium());

    const costoDirecto = costoDirectoEvento({
      costoMenuPorInvitado: costoMenu,
      pax,
      adicionales: adicionalesEvento(),
      paxPorMozo: new Decimal(15),
      costoMozoEvento: new Decimal(85000),
    });
    const costoTotal = costoTotalEvento(costoDirecto, new Decimal(12));
    const neto = precioNeto(costoTotal, new Decimal(1.45));
    const final = precioFinal(neto, new Decimal(21), new Decimal(100));

    expect(costoDirecto.toFixed(2)).toBe("3508576.00");
    expect(neto.toFixed(2)).toBe("5697927.42");
    expect(final.toFixed(2)).toBe("6894500.00");
  });
});

describe("calcularDotacionMozos", () => {
  // CP-14: Cálculo de dotación de mozos para 120 invitados con parámetro 15 pax por mozo.
  test("CP-14: 120 invitados a 15 pax por mozo da 8 mozos", () => {
    expect(calcularDotacionMozos(new Decimal(120), new Decimal(15)).toNumber()).toBe(8);
  });

  // CP-15: Cálculo de dotación con una cantidad de invitados exactamente divisible.
  test("CP-15: el redondeo hacia arriba no agrega un mozo de más cuando el cociente es entero", () => {
    expect(calcularDotacionMozos(new Decimal(150), new Decimal(15)).toNumber()).toBe(10);
  });

  test("redondea hacia arriba cuando el cociente no es entero", () => {
    expect(calcularDotacionMozos(new Decimal(121), new Decimal(15)).toNumber()).toBe(9);
  });
});

describe("costoDeAdicional", () => {
  // CP-16: Adicional de tipo fijo con cantidad de invitados variable.
  test("CP-16: el costo de un adicional fijo no cambia al variar la cantidad de invitados", () => {
    const adicional: AdicionalEvento = { tipoCobro: "FIJO", costoUnitario: new Decimal(320000) };

    const costoCon50 = costoDeAdicional(adicional, new Decimal(50));
    const costoCon200 = costoDeAdicional(adicional, new Decimal(200));

    expect(costoCon50.toFixed(2)).toBe("320000.00");
    expect(costoCon200.toFixed(2)).toBe("320000.00");
  });

  // CP-17: Adicional de tipo por persona.
  test("CP-17: el costo de un adicional por persona escala linealmente con la cantidad de invitados", () => {
    const adicional: AdicionalEvento = { tipoCobro: "POR_PERSONA", costoUnitario: new Decimal(4500) };

    const costoCon50 = costoDeAdicional(adicional, new Decimal(50));
    const costoCon100 = costoDeAdicional(adicional, new Decimal(100));

    expect(costoCon100.toFixed(2)).toBe(costoCon50.times(2).toFixed(2));
  });
});

describe("precioFinal (redondeo comercial)", () => {
  // CP-18: Redondeo del total final al múltiplo de cien.
  test("CP-18: un total de $6.894.492,18 se redondea a $6.894.500", () => {
    const final = redondearComercial(new Decimal("6894492.18"), new Decimal(100));

    expect(final.toFixed(2)).toBe("6894500.00");
  });
});

describe("margenSobreVenta", () => {
  test("un coeficiente de 1,45 equivale a un margen del 31,03% sobre la venta", () => {
    const margen = margenSobreVenta(new Decimal(1.45));

    expect(margen.times(100).toFixed(2)).toBe("31.03");
  });
});

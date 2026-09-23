import { describe, expect, test } from "vitest";
import Decimal from "decimal.js";
import { calcularDesgloseCarrito, calcularPrecioPublico, type LineaCarrito } from "./calculo";

const parametros = { gastosGeneralesPct: 12, ivaPorcentaje: 21, redondeoPrecioFinal: 100 };

describe("calcularPrecioPublico", () => {
  test("aplica gastos generales y coeficiente sobre el costo crudo", () => {
    // 85000 (costo) x 1.12 (gastos generales) x 1.45 (coeficiente) = 138040
    const precio = calcularPrecioPublico({ coeficienteVenta: 1.45, costoUnitario: 85000 }, parametros);
    expect(precio).toBe(138040);
  });
});

describe("calcularDesgloseCarrito", () => {
  test("cada línea usa su propio coeficiente; IVA y redondeo se aplican una sola vez sobre el total", () => {
    const lineas: LineaCarrito[] = [
      {
        tipoItem: "MENU",
        idReferencia: 1,
        descripcion: "Menú Premium",
        cantidad: 20,
        coeficienteVenta: 1.45,
        costoUnitario: new Decimal(14604.8), // costoMenuPorInvitado, mismo fixture que motor-cotizacion.test.ts
      },
      {
        tipoItem: "RECETA",
        idReferencia: 2,
        descripcion: "Tabla de quesos",
        cantidad: 3,
        coeficienteVenta: 1.6,
        costoUnitario: new Decimal(6000),
      },
      {
        tipoItem: "ADICIONAL",
        idReferencia: 3,
        descripcion: "DJ y sonido",
        cantidad: 1,
        coeficienteVenta: 1.45,
        costoUnitario: new Decimal(320000),
      },
    ];

    const desglose = calcularDesgloseCarrito(lineas, parametros);

    // Menú: 14604.8 x 1.12 x 1.45 = 23718.1952 -> x20 = 474363.904 -> 474363.90
    expect(desglose.lineas[0].precioUnitario).toBe(23718.2);
    expect(desglose.lineas[0].subtotal).toBe(474363.9);

    // Plato: 6000 x 1.12 x 1.6 = 10752 -> x3 = 32256
    expect(desglose.lineas[1].precioUnitario).toBe(10752);
    expect(desglose.lineas[1].subtotal).toBe(32256);

    // Adicional: 320000 x 1.12 x 1.45 = 519680
    expect(desglose.lineas[2].precioUnitario).toBe(519680);
    expect(desglose.lineas[2].subtotal).toBe(519680);

    const subtotalEsperado = 474363.9 + 32256 + 519680;
    expect(desglose.subtotalNeto).toBe(subtotalEsperado);

    const totalSinRedondear = subtotalEsperado * 1.21;
    const totalRedondeado = Math.round(totalSinRedondear / 100) * 100;
    expect(desglose.montoTotal).toBe(totalRedondeado);
  });

  test("un carrito vacío da desglose vacío y total cero", () => {
    const desglose = calcularDesgloseCarrito([], parametros);
    expect(desglose.lineas).toHaveLength(0);
    expect(desglose.subtotalNeto).toBe(0);
    expect(desglose.montoTotal).toBe(0);
  });
});

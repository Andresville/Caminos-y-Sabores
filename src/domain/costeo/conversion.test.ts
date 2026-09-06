import { describe, expect, test } from "vitest";
import Decimal from "decimal.js";
import { convertirACantidadBase } from "./conversion";
import { ErrorUnidadesIncompatibles } from "./errores";
import { GRAMO, KILOGRAMO, LITRO, MILILITRO, UNIDAD } from "./unidades.fixtures";
import type { Insumo } from "./tipos";

describe("convertirACantidadBase", () => {
  // Intentar cargar mililitros sobre un insumo de masa sin densidad.
  test("rechaza mililitros sobre un insumo de masa sin densidad declarada", () => {
    const suprema: Insumo = {
      nombre: "Suprema de Pollo",
      costoUnitario: new Decimal(9500),
      unidadCompra: KILOGRAMO,
    };

    expect(() => convertirACantidadBase(new Decimal(200), MILILITRO, suprema)).toThrow(
      ErrorUnidadesIncompatibles,
    );
  });

  // Cargar mililitros sobre un insumo de masa con densidad declarada.
  test("convierte usando la densidad cuando el insumo la tiene declarada", () => {
    const crema: Insumo = {
      nombre: "Crema de leche",
      costoUnitario: new Decimal(3000),
      unidadCompra: KILOGRAMO,
      densidadGml: new Decimal(1.02),
    };

    const cantidadBase = convertirACantidadBase(new Decimal(200), MILILITRO, crema);

    // 200 ml × 1,02 g/ml = 204 g. No debe lanzar y debe dar un resultado con sentido físico.
    expect(cantidadBase.toFixed(2)).toBe("204.00");
  });

  test("convierte usando la densidad cuando el insumo se compra por volumen y la receta declara masa", () => {
    const aceite: Insumo = {
      nombre: "Aceite de oliva",
      costoUnitario: new Decimal(2000),
      unidadCompra: LITRO,
      densidadGml: new Decimal(0.92),
    };

    // 100 g ÷ 0,92 g/ml = 108,6956... ml
    const cantidadBase = convertirACantidadBase(new Decimal(100), GRAMO, aceite);

    expect(cantidadBase.toFixed(4)).toBe("108.6957");
  });

  test("rechaza una conversión imposible aunque el insumo tenga densidad, si la magnitud es CONTEO", () => {
    const cajas: Insumo = {
      nombre: "Cajas de servilletas",
      costoUnitario: new Decimal(500),
      unidadCompra: UNIDAD,
      densidadGml: new Decimal(1), // una densidad no tiene sentido físico acá, pero no debe habilitar la conversión
    };

    expect(() => convertirACantidadBase(new Decimal(1), GRAMO, cajas)).toThrow(
      ErrorUnidadesIncompatibles,
    );
  });

  test("no convierte entre magnitudes cuando ambas unidades ya comparten magnitud", () => {
    const mozzarella: Insumo = {
      nombre: "Mozzarella",
      costoUnitario: new Decimal(16000),
      unidadCompra: KILOGRAMO,
    };

    const cantidadBase = convertirACantidadBase(new Decimal(500), GRAMO, mozzarella);

    expect(cantidadBase.toFixed(2)).toBe("500.00");
  });
});

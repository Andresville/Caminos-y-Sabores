import { describe, expect, test } from "vitest";
import Decimal from "decimal.js";
import { costearLinea, costearReceta, costoBaseInsumo } from "./motor-costeo";
import { ErrorCantidadInvalida, ErrorMermaInvalida } from "./errores";
import { GRAMO, KILOGRAMO, UNIDAD } from "./unidades.fixtures";
import type { Insumo, LineaReceta, Receta } from "./tipos";

function insumo(nombre: string, costoUnitario: number, unidadCompra = KILOGRAMO): Insumo {
  return { nombre, costoUnitario: new Decimal(costoUnitario), unidadCompra };
}

describe("costearLinea", () => {
  // Convertir 500 g declarados sobre un insumo comprado en kg.
  test("500 g de mozzarella comprada a $16.000/kg", () => {
    const linea: LineaReceta = {
      insumo: insumo("Mozzarella", 16000),
      cantidadUsada: new Decimal(500),
      unidadReceta: GRAMO,
    };

    const resultado = costearLinea(linea);

    expect(resultado.costoLinea.toFixed(2)).toBe("8000.00");
  });

  // Cantidad declarada en la misma unidad de compra.
  test("costo de línea con la unidad de la receta igual a la de compra", () => {
    const linea: LineaReceta = {
      insumo: insumo("Harina", 1000),
      cantidadUsada: new Decimal(2),
      unidadReceta: KILOGRAMO,
    };

    const resultado = costearLinea(linea);

    expect(resultado.costoLinea.toFixed(2)).toBe("2000.00");
  });

  // Cantidad usada igual a cero.
  test("rechaza la línea cuando la cantidad usada es cero", () => {
    const linea: LineaReceta = {
      insumo: insumo("Sal", 800),
      cantidadUsada: new Decimal(0),
      unidadReceta: GRAMO,
    };

    expect(() => costearLinea(linea)).toThrow(ErrorCantidadInvalida);
  });

  // Costo unitario del insumo igual a cero.
  test("rechaza un insumo con costo unitario igual a cero", () => {
    expect(() => costoBaseInsumo(insumo("Agua de canilla", 0))).toThrow(ErrorCantidadInvalida);
  });
});

describe("costearReceta", () => {
  // Fixture: receta "Supremas Rellenas" (4 porciones, 8 insumos).
  function lineasSupremasRellenas(): LineaReceta[] {
    return [
      { insumo: insumo("Queso Mozzarella", 16000), cantidadUsada: new Decimal(500), unidadReceta: GRAMO },
      { insumo: insumo("Suprema de Pollo", 9500), cantidadUsada: new Decimal(1), unidadReceta: KILOGRAMO },
      { insumo: insumo("Jamón Cocido", 14000), cantidadUsada: new Decimal(200), unidadReceta: GRAMO },
      { insumo: insumo("Huevo", 250, UNIDAD), cantidadUsada: new Decimal(1), unidadReceta: UNIDAD },
      { insumo: insumo("Leche en Polvo", 18000), cantidadUsada: new Decimal(250), unidadReceta: GRAMO },
      { insumo: insumo("Tomates Secos", 32000), cantidadUsada: new Decimal(150), unidadReceta: GRAMO },
      { insumo: insumo("Rebozador para Horno", 4200), cantidadUsada: new Decimal(250), unidadReceta: GRAMO },
      { insumo: insumo("Puré de Papas", 11000), cantidadUsada: new Decimal(250), unidadReceta: GRAMO },
    ];
  }

  // Receta completa de ocho ingredientes (Supremas Rellenas), con merma y mano de obra a nivel receta.
  test("costo total y por porción de Supremas Rellenas con merma y mano de obra de la receta", () => {
    const receta: Receta = {
      cantidadPorciones: 4,
      mermaPct: new Decimal(10),
      manoObraPct: new Decimal(20),
      lineas: lineasSupremasRellenas(),
    };

    const resultado = costearReceta(receta);

    // costoInsumos = 33650 (suma de las 8 líneas sin merma).
    expect(resultado.costoInsumos.toFixed(2)).toBe("33650.00");
    expect(resultado.mermaMonto.toFixed(2)).toBe("3365.00");
    expect(resultado.manoObraMonto.toFixed(2)).toBe("6730.00");
    expect(resultado.costoTotal.toFixed(2)).toBe("43745.00");
    expect(resultado.costoPorPorcion.toFixed(2)).toBe("10936.25");
  });

  // Misma receta sin merma ni mano de obra: costo total = costo de insumos.
  test("sin merma ni mano de obra, el costo total es igual al costo de insumos", () => {
    const receta: Receta = {
      cantidadPorciones: 4,
      mermaPct: new Decimal(0),
      manoObraPct: new Decimal(0),
      lineas: lineasSupremasRellenas(),
    };

    const resultado = costearReceta(receta);

    expect(resultado.costoTotal.toFixed(2)).toBe(resultado.costoInsumos.toFixed(2));
    expect(resultado.costoPorPorcion.toFixed(2)).toBe("8412.50");
  });

  test("rechaza una receta con cantidad de porciones igual a cero", () => {
    const receta: Receta = {
      cantidadPorciones: 0,
      mermaPct: new Decimal(0),
      manoObraPct: new Decimal(0),
      lineas: lineasSupremasRellenas(),
    };

    expect(() => costearReceta(receta)).toThrow(ErrorCantidadInvalida);
  });

  test("rechaza una merma de receta de 100% o más", () => {
    const receta: Receta = {
      cantidadPorciones: 4,
      mermaPct: new Decimal(100),
      manoObraPct: new Decimal(0),
      lineas: lineasSupremasRellenas(),
    };

    expect(() => costearReceta(receta)).toThrow(ErrorMermaInvalida);
  });

  test("rechaza una mano de obra negativa", () => {
    const receta: Receta = {
      cantidadPorciones: 4,
      mermaPct: new Decimal(0),
      manoObraPct: new Decimal(-5),
      lineas: lineasSupremasRellenas(),
    };

    expect(() => costearReceta(receta)).toThrow(ErrorCantidadInvalida);
  });
});

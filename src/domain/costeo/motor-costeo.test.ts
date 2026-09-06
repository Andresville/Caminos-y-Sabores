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
  // CP-01: Convertir 500 g declarados sobre un insumo comprado en kg.
  test("CP-01: 500 g de mozzarella comprada a $16.000/kg con 2% de merma", () => {
    const linea: LineaReceta = {
      insumo: insumo("Mozzarella", 16000),
      cantidadUsada: new Decimal(500),
      unidadReceta: GRAMO,
      porcentajeMerma: new Decimal(2),
    };

    const resultado = costearLinea(linea);

    expect(resultado.cantidadBruta.toFixed(2)).toBe("510.20");
    expect(resultado.costoLinea.toFixed(2)).toBe("8163.27");
  });

  // CP-02: Convertir cantidad declarada en la misma unidad de compra.
  test("CP-02: cantidad bruta igual a la neta ajustada solo por merma cuando la unidad coincide", () => {
    const linea: LineaReceta = {
      insumo: insumo("Harina", 1000),
      cantidadUsada: new Decimal(2),
      unidadReceta: KILOGRAMO,
      porcentajeMerma: new Decimal(10),
    };

    const resultado = costearLinea(linea);

    // cantidadBase = 2 × 1000 = 2000 g; bruta = 2000 / 0,9 = 2222,222...
    expect(resultado.cantidadBruta.toFixed(3)).toBe("2222.222");
  });

  // CP-05: Merma en el límite superior admitido, 99,9 %.
  test("CP-05: merma de 99,9% no produce error ni un resultado sin control", () => {
    const linea: LineaReceta = {
      insumo: insumo("Azafrán", 500000),
      cantidadUsada: new Decimal(1),
      unidadReceta: GRAMO,
      porcentajeMerma: new Decimal(99.9),
    };

    const resultado = costearLinea(linea);

    expect(resultado.cantidadBruta.isFinite()).toBe(true);
    expect(resultado.costoLinea.isFinite()).toBe(true);
    expect(resultado.cantidadBruta.toFixed(2)).toBe("1000.00");
  });

  // CP-06: Merma igual a 100%.
  test("CP-06: rechaza una merma de 100% antes de calcular", () => {
    const linea: LineaReceta = {
      insumo: insumo("Azafrán", 500000),
      cantidadUsada: new Decimal(1),
      unidadReceta: GRAMO,
      porcentajeMerma: new Decimal(100),
    };

    expect(() => costearLinea(linea)).toThrow(ErrorMermaInvalida);
  });

  // CP-07: Cantidad usada igual a cero.
  test("CP-07: rechaza la línea cuando la cantidad usada es cero", () => {
    const linea: LineaReceta = {
      insumo: insumo("Sal", 800),
      cantidadUsada: new Decimal(0),
      unidadReceta: GRAMO,
      porcentajeMerma: new Decimal(0),
    };

    expect(() => costearLinea(linea)).toThrow(ErrorCantidadInvalida);
  });

  // CP-08: Costo unitario del insumo igual a cero.
  test("CP-08: rechaza un insumo con costo unitario igual a cero", () => {
    expect(() => costoBaseInsumo(insumo("Agua de canilla", 0))).toThrow(ErrorCantidadInvalida);
  });
});

describe("costearReceta", () => {
  // Fixture: receta "Supremas Rellenas" de la sección 9.4 (4 porciones, 8 insumos).
  function lineasSupremasRellenas(): LineaReceta[] {
    return [
      { insumo: insumo("Queso Mozzarella", 16000), cantidadUsada: new Decimal(500), unidadReceta: GRAMO, porcentajeMerma: new Decimal(2) },
      { insumo: insumo("Suprema de Pollo", 9500), cantidadUsada: new Decimal(1), unidadReceta: KILOGRAMO, porcentajeMerma: new Decimal(8) },
      { insumo: insumo("Jamón Cocido", 14000), cantidadUsada: new Decimal(200), unidadReceta: GRAMO, porcentajeMerma: new Decimal(5) },
      { insumo: insumo("Huevo", 250, UNIDAD), cantidadUsada: new Decimal(1), unidadReceta: UNIDAD, porcentajeMerma: new Decimal(0) },
      { insumo: insumo("Leche en Polvo", 18000), cantidadUsada: new Decimal(250), unidadReceta: GRAMO, porcentajeMerma: new Decimal(0) },
      { insumo: insumo("Tomates Secos", 32000), cantidadUsada: new Decimal(150), unidadReceta: GRAMO, porcentajeMerma: new Decimal(0) },
      { insumo: insumo("Rebozador para Horno", 4200), cantidadUsada: new Decimal(250), unidadReceta: GRAMO, porcentajeMerma: new Decimal(3) },
      { insumo: insumo("Puré de Papas", 11000), cantidadUsada: new Decimal(250), unidadReceta: GRAMO, porcentajeMerma: new Decimal(0) },
    ];
  }

  // CP-09: Receta completa de ocho ingredientes (Supremas Rellenas).
  test("CP-09: costo total y por porción de Supremas Rellenas con las mermas declaradas", () => {
    const receta: Receta = { cantidadPorciones: 4, lineas: lineasSupremasRellenas() };

    const resultado = costearReceta(receta);

    expect(resultado.costoTotal.toFixed(2)).toBe("34819.19");
    expect(resultado.costoPorPorcion.toFixed(2)).toBe("8704.80");
  });

  // CP-10: Misma receta sin mermas cargadas.
  test("CP-10: la misma receta sin mermas da un costo menor", () => {
    const lineasSinMerma = lineasSupremasRellenas().map((linea) => ({
      ...linea,
      porcentajeMerma: new Decimal(0),
    }));
    const receta: Receta = { cantidadPorciones: 4, lineas: lineasSinMerma };

    const resultado = costearReceta(receta);

    expect(resultado.costoTotal.toFixed(2)).toBe("33650.00");
    expect(resultado.costoPorPorcion.toFixed(2)).toBe("8412.50");
  });

  test("rechaza una receta con cantidad de porciones igual a cero", () => {
    const receta: Receta = { cantidadPorciones: 0, lineas: lineasSupremasRellenas() };

    expect(() => costearReceta(receta)).toThrow(ErrorCantidadInvalida);
  });
});

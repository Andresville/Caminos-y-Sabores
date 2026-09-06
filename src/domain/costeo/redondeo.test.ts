import { describe, expect, test } from "vitest";
import Decimal from "decimal.js";
import { redondearComercial, redondearMoneda } from "./redondeo";

describe("redondearComercial", () => {
  // CP-18: Redondeo del total final al múltiplo de cien.
  test("CP-18: un total de $6.894.492,18 se redondea a $6.894.500", () => {
    expect(redondearComercial(new Decimal("6894492.18"), new Decimal(100)).toFixed(2)).toBe(
      "6894500.00",
    );
  });

  test("redondea hacia abajo cuando está más cerca del múltiplo inferior", () => {
    expect(redondearComercial(new Decimal("28749.00"), new Decimal(100)).toFixed(2)).toBe(
      "28700.00",
    );
  });
});

describe("redondearMoneda", () => {
  test("redondea a dos decimales", () => {
    expect(redondearMoneda(new Decimal("8163.265306")).toFixed(2)).toBe("8163.27");
  });
});

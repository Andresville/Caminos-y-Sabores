export class ErrorUnidadesIncompatibles extends Error {
  constructor(nombreInsumo: string, magnitudInsumo: string, magnitudDeclarada: string) {
    super(
      `Unidades incompatibles: "${nombreInsumo}" se compra en magnitud ${magnitudInsumo}, pero la línea declara magnitud ${magnitudDeclarada}, y el insumo no tiene densidad declarada para convertir.`,
    );
    this.name = "ErrorUnidadesIncompatibles";
  }
}

export class ErrorMermaInvalida extends Error {
  constructor(valorRecibido: string) {
    super(
      `El porcentaje de merma debe ser mayor o igual a 0 y menor a 100. Valor recibido: ${valorRecibido}`,
    );
    this.name = "ErrorMermaInvalida";
  }
}

export class ErrorCantidadInvalida extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorCantidadInvalida";
  }
}

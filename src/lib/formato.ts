/** Los importes se expresan en pesos argentinos, separador de miles punto, decimal coma. */
export const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export const formatoFechaCorta = new Intl.DateTimeFormat("es-AR");

export const formatoFechaLarga = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" });

/** Una fecha "YYYY-MM-DD" (sin hora) parseada como medianoche LOCAL, no UTC — new Date("YYYY-MM-DD") interpreta UTC y puede mostrar el día anterior en husos horarios negativos (ej. Argentina). */
export function fechaLocalDesdeISO(fechaISO: string): Date {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

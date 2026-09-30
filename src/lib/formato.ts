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

/** "hace 2 horas", "ayer", "hace 3 días" — para listados tipo bandeja de solicitudes. */
export function formatoRelativo(fecha: Date): string {
  const segundos = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (segundos < 60) return "hace un momento";
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} minuto${minutos === 1 ? "" : "s"}`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} hora${horas === 1 ? "" : "s"}`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  const semanas = Math.floor(dias / 7);
  if (semanas < 5) return `hace ${semanas} semana${semanas === 1 ? "" : "s"}`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses} mes${meses === 1 ? "" : "es"}`;
}

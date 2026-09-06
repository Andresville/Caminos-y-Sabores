/** Los importes se expresan en pesos argentinos, separador de miles punto, decimal coma. */
export const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

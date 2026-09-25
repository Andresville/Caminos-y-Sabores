/** Solo se acepta un destino relativo propio (nunca una URL externa ni protocol-relative) — evita que este parámetro se use para redirigir fuera del sitio. */
export function redirigirSeguro(destino: string | null | undefined): string {
  if (destino && destino.startsWith("/") && !destino.startsWith("//")) return destino;
  return "/";
}

import { headers } from "next/headers";

/** Dirección de red del cliente, usada para el límite de emisiones y la verificación anti-automatización. null si no se pudo determinar. */
export async function obtenerIpCliente(): Promise<string | null> {
  const cabeceras = await headers();
  const reenviada = cabeceras.get("x-forwarded-for");
  if (reenviada) return reenviada.split(",")[0].trim();
  return cabeceras.get("x-real-ip");
}

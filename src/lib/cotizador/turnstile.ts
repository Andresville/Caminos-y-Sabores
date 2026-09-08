/** Verificación anti-automatización contra la API de Cloudflare Turnstile. Falla cerrado: sin secret configurado o ante cualquier error, no deja pasar. */
export async function verificarTurnstile(token: string | null, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[cotizador] TURNSTILE_SECRET_KEY no configurada, se rechaza la verificación anti-automatización.");
    return false;
  }
  if (!token) return false;

  try {
    const cuerpo = new URLSearchParams({ secret, response: token });
    if (ip) cuerpo.set("remoteip", ip);

    const respuesta = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: cuerpo,
    });
    const datos = (await respuesta.json()) as { success: boolean };
    return datos.success === true;
  } catch (error) {
    console.error("[cotizador] error al verificar Turnstile:", error);
    return false;
  }
}

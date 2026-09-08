import { Resend } from "resend";

/**
 * Envío del PDF por correo. La caída del servicio de correo no debe
 * impedir la emisión ni la descarga del presupuesto: por eso esta
 * función nunca lanza, solo devuelve si pudo enviar o no, y quien la
 * llama sigue adelante en cualquier caso.
 */
export async function enviarPdfCotizacion(params: {
  destinatario: string;
  codigo: string;
  pdf: Buffer;
}): Promise<{ enviado: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`[cotizador] RESEND_API_KEY no configurada, no se pudo enviar ${params.codigo}`);
    return { enviado: false };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to: params.destinatario,
      subject: `Tu presupuesto ${params.codigo} — Caminos y Sabores`,
      text: `Hola, adjuntamos tu presupuesto ${params.codigo}. Los precios quedaron congelados a la fecha de emisión.`,
      attachments: [{ filename: `${params.codigo}.pdf`, content: params.pdf }],
    });

    if (error) {
      console.error(`[cotizador] error al enviar ${params.codigo}:`, error);
      return { enviado: false };
    }
    return { enviado: true };
  } catch (error) {
    console.error(`[cotizador] excepción al enviar ${params.codigo}:`, error);
    return { enviado: false };
  }
}

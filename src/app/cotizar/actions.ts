"use server";

import { createHash } from "node:crypto";
import { calcularDesglosePublico, type DesglosePublico } from "@/lib/cotizador/calculo";
import { obtenerAdicionalesParaCalculo, obtenerMenuParaCalculo, obtenerParametrosPortal } from "@/lib/cotizador/datos";
import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerIpCliente } from "@/lib/cotizador/ip";
import { verificarTurnstile } from "@/lib/cotizador/turnstile";
import { renderizarPdfCotizacion } from "@/lib/cotizador/pdf";
import { enviarPdfCotizacion } from "@/lib/cotizador/email";

export interface EntradaSimulacion {
  pax: number;
  idMenu: number | null;
  idsAdicionales: number[];
}

export type ResultadoSimulacion =
  | { tipo: "ok"; desglose: DesglosePublico }
  | { tipo: "bajo_minimo_evento"; minimo: number }
  | { tipo: "excede_maximo"; maximo: number }
  | { tipo: "bajo_minimo_menu"; minimo: number; nombreMenu: string }
  | { tipo: "error"; mensaje: string };

/**
 * Valida los límites de invitados y calcula el desglose público. La
 * usan tanto simular() como confirmarCotizacion(): esta última NUNCA
 * confía en el desglose que le manda el cliente, siempre recalcula
 * desde cero con datos frescos antes de persistir.
 */
async function calcularOValidar(entrada: EntradaSimulacion): Promise<ResultadoSimulacion> {
  if (!Number.isInteger(entrada.pax) || entrada.pax <= 0) {
    return { tipo: "error", mensaje: "Ingresá una cantidad de invitados válida." };
  }

  const parametros = await obtenerParametrosPortal();

  if (entrada.pax < parametros.paxMinimoEvento) {
    return { tipo: "bajo_minimo_evento", minimo: parametros.paxMinimoEvento };
  }
  if (entrada.pax > parametros.paxMaximoAutomatico) {
    return { tipo: "excede_maximo", maximo: parametros.paxMaximoAutomatico };
  }

  const [menu, adicionales] = await Promise.all([
    entrada.idMenu ? obtenerMenuParaCalculo(entrada.idMenu) : Promise.resolve(null),
    obtenerAdicionalesParaCalculo(entrada.idsAdicionales),
  ]);

  if (entrada.idMenu && !menu) {
    return { tipo: "error", mensaje: "El menú elegido ya no está disponible. Volvé a elegir un menú." };
  }
  if (menu && entrada.pax < menu.paxMinimo) {
    return { tipo: "bajo_minimo_menu", minimo: menu.paxMinimo, nombreMenu: menu.nombreMenu };
  }

  const desglose = calcularDesglosePublico(entrada.pax, menu, adicionales, parametros);
  return { tipo: "ok", desglose };
}

/**
 * Recalcula el presupuesto en el servidor sin persistir nada — el
 * cliente nunca calcula el total por su cuenta — y nunca devuelve
 * costo ni coeficiente de venta: solo el desglose público.
 */
export async function simular(entrada: EntradaSimulacion): Promise<ResultadoSimulacion> {
  return calcularOValidar(entrada);
}

export interface EntradaConfirmacion extends EntradaSimulacion {
  fechaEvento: string;
  tipoEvento: string;
  nombreCliente: string;
  emailCliente: string;
  telefonoCliente: string;
  consentimientoDatos: boolean;
  tokenTurnstile: string;
}

export type ResultadoConfirmacion =
  | { tipo: "ok"; codigo: string; fechaValidez: string }
  | { tipo: "error"; mensaje: string };

/**
 * Emite y persiste la cotización a partir de una simulación
 * confirmada. Vuelve a validar y recalcular todo desde cero (nunca
 * confía en lo que mandó el cliente), verifica la protección
 * anti-automatización y el límite de emisiones por dirección de red,
 * persiste el encabezado y las líneas congeladas, y dispara el envío
 * del PDF sin que una falla de correo bloquee la emisión.
 */
export async function confirmarCotizacion(entrada: EntradaConfirmacion): Promise<ResultadoConfirmacion> {
  const nombreCliente = entrada.nombreCliente.trim();
  const emailCliente = entrada.emailCliente.trim();

  if (!nombreCliente) return { tipo: "error", mensaje: "Ingresá tu nombre y apellido." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCliente)) return { tipo: "error", mensaje: "Ingresá un email válido." };
  if (!entrada.consentimientoDatos) {
    return { tipo: "error", mensaje: "Tenés que aceptar la política de privacidad para poder emitir." };
  }
  if (!entrada.idMenu) return { tipo: "error", mensaje: "Elegí un menú antes de confirmar." };

  const fechaEvento = new Date(entrada.fechaEvento);
  if (Number.isNaN(fechaEvento.getTime()) || fechaEvento < new Date(new Date().toDateString())) {
    return { tipo: "error", mensaje: "Ingresá una fecha de evento válida." };
  }

  const ip = await obtenerIpCliente();

  const esHumano = await verificarTurnstile(entrada.tokenTurnstile, ip);
  if (!esHumano) {
    return { tipo: "error", mensaje: "No pudimos verificar que sos una persona. Volvé a intentar." };
  }

  const admin = createAdminClient();
  const { data: puedeEmitir } = await admin.rpc("puede_emitir_cotizacion", { p_ip: ip });
  if (puedeEmitir === false) {
    return {
      tipo: "error",
      mensaje: "Alcanzaste el límite de presupuestos que se pueden emitir en poco tiempo. Probá de nuevo más tarde.",
    };
  }

  const resultado = await calcularOValidar(entrada);
  if (resultado.tipo !== "ok") {
    return {
      tipo: "error",
      mensaje:
        resultado.tipo === "error"
          ? resultado.mensaje
          : "La configuración del evento cambió. Volvé a revisar los pasos anteriores.",
    };
  }

  const parametros = await obtenerParametrosPortal();
  const { desglose } = resultado;

  const { data: emision, error: errorEmision } = await admin
    .rpc("emitir_cotizacion", {
      p_tipo_evento: entrada.tipoEvento,
      p_fecha_evento: entrada.fechaEvento,
      p_cantidad_pax: entrada.pax,
      p_id_menu: entrada.idMenu,
      p_nombre_cliente: nombreCliente,
      p_email_cliente: emailCliente,
      p_telefono_cliente: entrada.telefonoCliente.trim() || null,
      p_consentimiento_datos: entrada.consentimientoDatos,
      p_origen_ip: ip,
      p_subtotal_neto: desglose.subtotalNeto,
      p_monto_iva: desglose.montoIva,
      p_monto_total: desglose.montoTotal,
      p_validez_dias: parametros.validezCotizacionDias,
      p_lineas: desglose.lineas.map((linea) => ({
        tipo_item: linea.tipoItem,
        referencia_id: linea.idReferencia,
        descripcion: linea.descripcion,
        cantidad: linea.cantidad,
        precio_unitario: linea.precioUnitario,
        subtotal: linea.subtotal,
      })),
    })
    .single();

  if (errorEmision || !emision) {
    console.error("[cotizador] error en emitir_cotizacion:", errorEmision);
    return { tipo: "error", mensaje: "No pudimos emitir tu presupuesto. Volvé a intentar en un momento." };
  }

  const { id_cotizacion: idCotizacion, codigo, fecha_validez: fechaValidez } = emision as {
    id_cotizacion: number;
    codigo: string;
    fecha_validez: string;
  };
  const fechaEmisionIso = new Date().toISOString();

  const hash = createHash("sha256")
    .update(JSON.stringify({ codigo, fechaEmisionIso, desglose }))
    .digest("hex");
  await admin.rpc("actualizar_hash_cotizacion", { p_id_cotizacion: idCotizacion, p_hash: hash });

  const pdf = await renderizarPdfCotizacion({
    codigo,
    fechaEmision: fechaEmisionIso,
    fechaValidez,
    nombreCliente,
    tipoEvento: entrada.tipoEvento,
    cantidadPax: entrada.pax,
    lineas: desglose.lineas,
    subtotalNeto: desglose.subtotalNeto,
    montoIva: desglose.montoIva,
    montoTotal: desglose.montoTotal,
  });
  await enviarPdfCotizacion({ destinatario: emailCliente, codigo, pdf });

  return { tipo: "ok", codigo, fechaValidez };
}

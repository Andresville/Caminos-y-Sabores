"use server";

import { createClient } from "@/lib/supabase/server";
import { calcularDesgloseCarrito, type DesgloseCarrito, type LineaCarrito, type TipoItemCarrito } from "@/lib/cotizador/calculo";
import {
  obtenerAdicionalesParaCalculo,
  obtenerMenuParaCalculo,
  obtenerParametrosPortal,
  obtenerRecetaParaCalculo,
  type ParametrosPortal,
} from "@/lib/cotizador/datos";
import { renderizarPdfCotizacion } from "@/lib/cotizador/pdf";
import { enviarPdfCotizacion } from "@/lib/cotizador/email";

export interface ItemCarritoEntrada {
  tipoItem: TipoItemCarrito;
  idReferencia: number;
  cantidad: number;
}

/**
 * Resuelve los ítems del carrito (menú/plato) a líneas con precio real,
 * recalculado siempre desde la base — nunca confía en nada que mande el
 * navegador. Los adicionales NO entran acá: son informativos, sin precio
 * propio en esta instancia (los cotiza el equipo comercial aparte).
 */
async function resolverLineasPrecificadas(
  items: ItemCarritoEntrada[],
  parametros: ParametrosPortal,
): Promise<{ tipo: "ok"; lineas: LineaCarrito[] } | { tipo: "error"; mensaje: string }> {
  const idsMenu = items.filter((item) => item.tipoItem === "MENU").map((item) => item.idReferencia);
  const idsReceta = items.filter((item) => item.tipoItem === "RECETA").map((item) => item.idReferencia);

  const [menus, recetas] = await Promise.all([
    Promise.all(idsMenu.map((idMenu) => obtenerMenuParaCalculo(idMenu, parametros))),
    Promise.all(idsReceta.map((idReceta) => obtenerRecetaParaCalculo(idReceta, parametros))),
  ]);

  const lineas: LineaCarrito[] = [];
  for (const item of items) {
    if (item.tipoItem === "MENU") {
      const menu = menus.find((m) => m?.idMenu === item.idReferencia);
      if (!menu) return { tipo: "error", mensaje: "Algún menú de tu carrito ya no está disponible." };
      if (item.cantidad < menu.paxMinimo) {
        return { tipo: "error", mensaje: `"${menu.nombreMenu}" requiere un mínimo de ${menu.paxMinimo} invitados.` };
      }
      lineas.push({
        tipoItem: "MENU",
        idReferencia: menu.idMenu,
        descripcion: menu.nombreMenu,
        cantidad: item.cantidad,
        coeficienteVenta: 1, // el menú ya no tiene margen propio: costoPorPersona ya viene con el margen de cada receta incluido
        costoUnitario: menu.costoPorPersona,
      });
    } else if (item.tipoItem === "RECETA") {
      const receta = recetas.find((r) => r?.idReceta === item.idReferencia);
      if (!receta) return { tipo: "error", mensaje: "Algún plato de tu carrito ya no está disponible." };
      if (item.cantidad < receta.cantidadPorciones) {
        return {
          tipo: "error",
          mensaje: `"${receta.nombrePlato}" requiere un mínimo de ${receta.cantidadPorciones} porciones.`,
        };
      }
      lineas.push({
        tipoItem: "RECETA",
        idReferencia: receta.idReceta,
        descripcion: receta.nombrePlato,
        cantidad: item.cantidad,
        coeficienteVenta: receta.coeficienteVenta,
        costoUnitario: receta.costoPorPorcion,
      });
    }
  }
  return { tipo: "ok", lineas };
}

export interface EntradaSimulacion {
  items: ItemCarritoEntrada[];
  idsAdicionales: number[];
}

export type ResultadoSimulacion =
  | { tipo: "ok"; desglose: DesgloseCarrito; nombresAdicionales: string[] }
  | { tipo: "error"; mensaje: string };

/**
 * Estimado instantáneo del carrito, sin persistir nada y sin requerir
 * sesión — el cliente puede verlo antes de decidir si pide contacto
 * comercial. Los adicionales solo se listan por nombre (sin precio):
 * los cotiza el equipo comercial en la negociación.
 */
export async function simularPresupuesto(entrada: EntradaSimulacion): Promise<ResultadoSimulacion> {
  if (entrada.items.length === 0) return { tipo: "error", mensaje: "Tu carrito está vacío." };

  const parametros = await obtenerParametrosPortal();
  const resuelto = await resolverLineasPrecificadas(entrada.items, parametros);
  if (resuelto.tipo === "error") return resuelto;

  const adicionales = await obtenerAdicionalesParaCalculo(entrada.idsAdicionales);
  const nombresAdicionales = entrada.idsAdicionales
    .map((id) => adicionales.find((a) => a.idAdicional === id)?.nombreServicio)
    .filter((nombre): nombre is string => Boolean(nombre));

  const desglose = calcularDesgloseCarrito(resuelto.lineas, parametros);
  return { tipo: "ok", desglose, nombresAdicionales };
}

export interface EntradaEnvioPedido {
  items: ItemCarritoEntrada[];
  idsAdicionales: number[];
  nombreEvento: string;
  fechaEvento: string;
  cantidadComensales: number;
  consentimientoDatos: boolean;
}

export type ResultadoEnvioPedido =
  | { tipo: "ok"; codigo: string; idCotizacion: number }
  | { tipo: "error"; mensaje: string };

/**
 * "Solicitar contacto comercial": recalcula todo desde cero en el
 * servidor (nunca confía en el total que mandó el navegador) y
 * persiste la cotización en estado SOLICITADO — un estimado automático,
 * todavía no revisado por Comercial.
 */
export async function enviarPedido(entrada: EntradaEnvioPedido): Promise<ResultadoEnvioPedido> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { tipo: "error", mensaje: "Iniciá sesión para enviar tu pedido." };

  const { data: cliente } = await supabase
    .from("cliente")
    .select("nombre_completo, email, telefono")
    .eq("id_cliente", userData.user.id)
    .single();
  if (!cliente) return { tipo: "error", mensaje: "No pudimos encontrar tu perfil de cliente." };

  if (entrada.items.length === 0) return { tipo: "error", mensaje: "Tu carrito está vacío." };
  if (!entrada.nombreEvento.trim()) return { tipo: "error", mensaje: "Ingresá el nombre del evento." };
  if (!entrada.fechaEvento) return { tipo: "error", mensaje: "Ingresá la fecha del evento." };
  if (entrada.fechaEvento < new Date().toISOString().slice(0, 10)) {
    return { tipo: "error", mensaje: "La fecha del evento no puede ser una fecha pasada." };
  }
  if (!Number.isInteger(entrada.cantidadComensales) || entrada.cantidadComensales < 1) {
    return { tipo: "error", mensaje: "Ingresá una cantidad de comensales válida." };
  }
  if (!entrada.consentimientoDatos) {
    return { tipo: "error", mensaje: "Tenés que aceptar los Términos y Condiciones para continuar." };
  }

  const parametros = await obtenerParametrosPortal();
  const resuelto = await resolverLineasPrecificadas(entrada.items, parametros);
  if (resuelto.tipo === "error") return resuelto;

  const adicionales = await obtenerAdicionalesParaCalculo(entrada.idsAdicionales);
  const nombresAdicionales: string[] = [];
  for (const idAdicional of entrada.idsAdicionales) {
    const adicional = adicionales.find((a) => a.idAdicional === idAdicional);
    if (!adicional) return { tipo: "error", mensaje: "Algún servicio adicional que elegiste ya no está disponible." };
    nombresAdicionales.push(adicional.nombreServicio);
  }

  const desglose = calcularDesgloseCarrito(resuelto.lineas, parametros);

  // Los adicionales viajan como líneas informativas sin precio (el equipo
  // comercial los cotiza en la negociación) — no suman al subtotal/IVA/total.
  const lineasParaGuardar = [
    ...desglose.lineas.map((linea) => ({
      tipo_item: linea.tipoItem,
      referencia_id: linea.idReferencia,
      descripcion: linea.descripcion,
      cantidad: linea.cantidad,
      precio_unitario: linea.precioUnitario,
      subtotal: linea.subtotal,
    })),
    ...entrada.idsAdicionales.map((idAdicional, indice) => ({
      tipo_item: "ADICIONAL",
      referencia_id: idAdicional,
      descripcion: nombresAdicionales[indice],
      cantidad: 1,
      precio_unitario: 0,
      subtotal: 0,
    })),
  ];

  const { data: emision, error } = await supabase
    .rpc("emitir_cotizacion_cliente", {
      p_id_cliente: userData.user.id,
      p_tipo_evento: entrada.nombreEvento,
      p_fecha_evento: entrada.fechaEvento,
      p_cantidad_pax: entrada.cantidadComensales,
      p_nombre_cliente: cliente.nombre_completo,
      p_email_cliente: cliente.email,
      p_telefono_cliente: cliente.telefono,
      p_consentimiento_datos: entrada.consentimientoDatos,
      p_subtotal_neto: desglose.subtotalNeto,
      p_monto_iva: desglose.montoIva,
      p_monto_total: desglose.montoTotal,
      p_validez_dias: parametros.validezCotizacionDias,
      p_lineas: lineasParaGuardar,
    })
    .single();

  if (error || !emision) {
    console.error("[carrito] error en emitir_cotizacion_cliente:", error);
    return { tipo: "error", mensaje: "No pudimos enviar tu pedido. Volvé a intentar en un momento." };
  }

  const { id_cotizacion: idCotizacion, codigo, fecha_validez: fechaValidez } = emision as {
    id_cotizacion: number;
    codigo: string;
    fecha_validez: string;
  };

  try {
    const pdf = await renderizarPdfCotizacion({
      codigo,
      fechaEmision: new Date().toISOString(),
      fechaValidez,
      nombreCliente: cliente.nombre_completo,
      tipoEvento: entrada.nombreEvento,
      cantidadPax: entrada.cantidadComensales,
      lineas: desglose.lineas,
      subtotalNeto: desglose.subtotalNeto,
      montoIva: desglose.montoIva,
      montoTotal: desglose.montoTotal,
    });
    await enviarPdfCotizacion({ destinatario: cliente.email, codigo, pdf });
  } catch (excepcion) {
    console.error("[carrito] no se pudo generar/enviar el PDF del estimado:", excepcion);
  }

  return { tipo: "ok", codigo, idCotizacion };
}

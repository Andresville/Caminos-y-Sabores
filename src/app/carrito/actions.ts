"use server";

import { createClient } from "@/lib/supabase/server";
import { calcularDesgloseCarrito, type LineaCarrito, type TipoItemCarrito } from "@/lib/cotizador/calculo";
import {
  obtenerAdicionalesParaCalculo,
  obtenerMenuParaCalculo,
  obtenerParametrosPortal,
  obtenerRecetaParaCalculo,
} from "@/lib/cotizador/datos";
import { renderizarPdfCotizacion } from "@/lib/cotizador/pdf";
import { enviarPdfCotizacion } from "@/lib/cotizador/email";

export interface ItemCarritoEntrada {
  tipoItem: TipoItemCarrito;
  idReferencia: number;
  cantidad: number;
}

export interface EntradaEnvioPedido {
  items: ItemCarritoEntrada[];
  tipoEvento: string;
  fechaEvento: string;
  consentimientoDatos: boolean;
}

export type ResultadoEnvioPedido =
  | { tipo: "ok"; codigo: string; idCotizacion: number }
  | { tipo: "error"; mensaje: string };

/**
 * Equivalente a "solicitar presupuesto" del carrito: recalcula todo
 * desde cero en el servidor (nunca confía en el total que mandó el
 * navegador) y persiste la cotización en estado EMITIDA — un
 * estimado automático, todavía no revisado por Comercial.
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
  if (!entrada.tipoEvento) return { tipo: "error", mensaje: "Elegí el tipo de evento." };
  if (!entrada.fechaEvento) return { tipo: "error", mensaje: "Ingresá la fecha del evento." };
  if (!entrada.consentimientoDatos) {
    return { tipo: "error", mensaje: "Tenés que aceptar la política de privacidad para continuar." };
  }

  const parametros = await obtenerParametrosPortal();

  const idsMenu = entrada.items.filter((item) => item.tipoItem === "MENU").map((item) => item.idReferencia);
  const idsReceta = entrada.items.filter((item) => item.tipoItem === "RECETA").map((item) => item.idReferencia);
  const idsAdicional = entrada.items.filter((item) => item.tipoItem === "ADICIONAL").map((item) => item.idReferencia);

  const [menus, recetas, adicionales] = await Promise.all([
    Promise.all(idsMenu.map((idMenu) => obtenerMenuParaCalculo(idMenu))),
    Promise.all(idsReceta.map((idReceta) => obtenerRecetaParaCalculo(idReceta))),
    obtenerAdicionalesParaCalculo(idsAdicional),
  ]);

  const lineas: LineaCarrito[] = [];
  for (const item of entrada.items) {
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
        coeficienteVenta: menu.coeficienteVenta,
        costoUnitario: menu.costoPorPersona,
      });
    } else if (item.tipoItem === "RECETA") {
      const receta = recetas.find((r) => r?.idReceta === item.idReferencia);
      if (!receta) return { tipo: "error", mensaje: "Algún plato de tu carrito ya no está disponible." };
      lineas.push({
        tipoItem: "RECETA",
        idReferencia: receta.idReceta,
        descripcion: receta.nombrePlato,
        cantidad: item.cantidad,
        coeficienteVenta: receta.coeficienteVenta,
        costoUnitario: receta.costoPorPorcion,
      });
    } else {
      const adicional = adicionales.find((a) => a.idAdicional === item.idReferencia);
      if (!adicional) return { tipo: "error", mensaje: "Algún servicio adicional de tu carrito ya no está disponible." };
      lineas.push({
        tipoItem: "ADICIONAL",
        idReferencia: adicional.idAdicional,
        descripcion: adicional.nombreServicio,
        cantidad: item.cantidad,
        coeficienteVenta: adicional.coeficienteVenta,
        costoUnitario: adicional.costoUnitario,
      });
    }
  }

  const desglose = calcularDesgloseCarrito(lineas, parametros);

  const { data: emision, error } = await supabase
    .rpc("emitir_cotizacion_cliente", {
      p_id_cliente: userData.user.id,
      p_tipo_evento: entrada.tipoEvento,
      p_fecha_evento: entrada.fechaEvento,
      p_nombre_cliente: cliente.nombre_completo,
      p_email_cliente: cliente.email,
      p_telefono_cliente: cliente.telefono,
      p_consentimiento_datos: entrada.consentimientoDatos,
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
      tipoEvento: entrada.tipoEvento,
      cantidadPax: lineas.reduce((suma, linea) => suma + linea.cantidad, 0),
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

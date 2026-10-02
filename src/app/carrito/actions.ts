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

export interface ItemCarritoEntrada {
  tipoItem: TipoItemCarrito;
  idReferencia: number;
  cantidad: number;
}

export interface AdicionalSeleccionadoEntrada {
  idAdicional: number;
  /** Solo relevante para servicios POR_PERSONA (no todos los invitados beben, por ejemplo) — se ignora en FIJO y POR_MESA. */
  cantidadPersonas?: number;
}

/** Cuántos invitados caben por mesa para los adicionales que se cobran "por mesa" (mantel, centro de mesa, etc.) — no es un dato que cargue el cliente. */
const INVITADOS_POR_MESA = 8;

/**
 * Resuelve los ítems del carrito (menú/plato) y los servicios
 * adicionales elegidos a líneas con precio real, recalculado siempre
 * desde la base — nunca confía en nada que mande el navegador.
 */
async function resolverLineasPrecificadas(
  items: ItemCarritoEntrada[],
  adicionalesSeleccionados: AdicionalSeleccionadoEntrada[],
  cantidadComensales: number,
  parametros: ParametrosPortal,
): Promise<{ tipo: "ok"; lineas: LineaCarrito[] } | { tipo: "error"; mensaje: string }> {
  const idsMenu = items.filter((item) => item.tipoItem === "MENU").map((item) => item.idReferencia);
  const idsReceta = items.filter((item) => item.tipoItem === "RECETA").map((item) => item.idReferencia);

  const [menus, recetas, adicionales] = await Promise.all([
    Promise.all(idsMenu.map((idMenu) => obtenerMenuParaCalculo(idMenu, parametros))),
    Promise.all(idsReceta.map((idReceta) => obtenerRecetaParaCalculo(idReceta, parametros))),
    obtenerAdicionalesParaCalculo(adicionalesSeleccionados.map((a) => a.idAdicional)),
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

  for (const seleccion of adicionalesSeleccionados) {
    const adicional = adicionales.find((a) => a.idAdicional === seleccion.idAdicional);
    if (!adicional) return { tipo: "error", mensaje: "Algún servicio adicional que elegiste ya no está disponible." };

    let cantidad: number;
    if (adicional.tipoCobro === "FIJO") {
      cantidad = 1;
    } else if (adicional.tipoCobro === "POR_MESA") {
      cantidad = Math.ceil(cantidadComensales / INVITADOS_POR_MESA);
    } else {
      cantidad = seleccion.cantidadPersonas ?? cantidadComensales;
      if (!Number.isInteger(cantidad) || cantidad < 1) {
        return { tipo: "error", mensaje: `Ingresá una cantidad de personas válida para "${adicional.nombreServicio}".` };
      }
      if (cantidad > cantidadComensales) {
        return {
          tipo: "error",
          mensaje: `"${adicional.nombreServicio}" no puede ser para más personas que la cantidad de comensales.`,
        };
      }
    }

    lineas.push({
      tipoItem: "ADICIONAL",
      idReferencia: adicional.idAdicional,
      descripcion: adicional.nombreServicio,
      cantidad,
      coeficienteVenta: adicional.coeficienteVenta,
      costoUnitario: adicional.costoUnitario,
    });
  }

  return { tipo: "ok", lineas };
}

export interface EntradaCreacionPresupuesto {
  items: ItemCarritoEntrada[];
  adicionalesSeleccionados: AdicionalSeleccionadoEntrada[];
  nombreEvento: string;
  fechaEvento: string;
  cantidadComensales: number;
  consentimientoDatos: boolean;
}

export type ResultadoCreacionPresupuesto =
  | { tipo: "ok"; codigo: string; idCotizacion: number; desglose: DesgloseCarrito }
  | { tipo: "error"; mensaje: string };

/**
 * "Ver presupuesto estimado": recalcula todo desde cero en el servidor
 * (nunca confía en el total que mandó el navegador) y persiste la
 * cotización en estado PENDIENTE — todavía no es un pedido real, ni
 * siquiera llega al backoffice. Recién si el cliente la confirma
 * ("Solicitar contacto comercial", ver responderPresupuesto en
 * mis-presupuestos) pasa a SOLICITADO y ahí sí la ve Comercial.
 */
export async function crearPresupuestoPendiente(
  entrada: EntradaCreacionPresupuesto,
): Promise<ResultadoCreacionPresupuesto> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { tipo: "error", mensaje: "Iniciá sesión para ver tu presupuesto." };

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
  const resuelto = await resolverLineasPrecificadas(
    entrada.items,
    entrada.adicionalesSeleccionados,
    entrada.cantidadComensales,
    parametros,
  );
  if (resuelto.tipo === "error") return resuelto;

  const desglose = calcularDesgloseCarrito(resuelto.lineas, parametros);

  const lineasParaGuardar = desglose.lineas.map((linea) => ({
    tipo_item: linea.tipoItem,
    referencia_id: linea.idReferencia,
    descripcion: linea.descripcion,
    cantidad: linea.cantidad,
    precio_unitario: linea.precioUnitario,
    subtotal: linea.subtotal,
  }));

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
    return { tipo: "error", mensaje: "No pudimos calcular tu presupuesto. Volvé a intentar en un momento." };
  }

  const { id_cotizacion: idCotizacion, codigo } = emision as {
    id_cotizacion: number;
    codigo: string;
    fecha_validez: string;
  };

  return { tipo: "ok", codigo, idCotizacion, desglose };
}

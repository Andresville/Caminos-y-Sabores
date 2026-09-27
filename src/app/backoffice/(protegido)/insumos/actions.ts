"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface EstadoFormulario {
  error?: string;
}

export interface FilaHistoricoPrecio {
  id_historico: number;
  precio_bulto_anterior: number;
  precio_bulto_nuevo: number;
  cantidad_bulto_anterior: number;
  cantidad_bulto_nuevo: number;
  variacion_pct: number;
  motivo: string | null;
  fecha_cambio: string;
  nombre_usuario: string | null;
}

/** Historial de cambios de precio de un insumo, más reciente primero. RLS ya limita esto a los roles que pueden ver precios. */
export async function obtenerHistoricoPrecio(idMateriaPrima: number): Promise<FilaHistoricoPrecio[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("historico_precio_mp")
    .select(
      "id_historico, precio_bulto_anterior, precio_bulto_nuevo, cantidad_bulto_anterior, cantidad_bulto_nuevo, variacion_pct, motivo, fecha_cambio, usuario:id_usuario ( nombre_completo )",
    )
    .eq("id_materia_prima", idMateriaPrima)
    .order("fecha_cambio", { ascending: false })
    .returns<
      Array<
        Omit<FilaHistoricoPrecio, "nombre_usuario"> & { usuario: { nombre_completo: string } | null }
      >
    >();

  return (data ?? []).map((fila) => ({
    ...fila,
    nombre_usuario: fila.usuario?.nombre_completo ?? null,
  }));
}

function mensajeAmigable(codigo: string | undefined, mensajeOriginal: string): string {
  if (codigo === "23505") {
    return "Ya existe un insumo con ese nombre en esa categoría.";
  }
  if (codigo === "23514") {
    return "El precio y el peso del bulto deben ser mayores a cero.";
  }
  return mensajeOriginal;
}

/** Busca una categoría por nombre (sin importar mayúsculas); si no existe, la crea. */
async function resolverCategoria(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nombreCategoria: string,
): Promise<{ id?: number; error?: string }> {
  const nombre = nombreCategoria.trim();
  if (!nombre) return { error: "Elegí o cargá una categoría." };

  const { data: existente } = await supabase
    .from("categoria_insumo")
    .select("id_categoria")
    .ilike("nombre", nombre)
    .maybeSingle();
  if (existente) return { id: existente.id_categoria };

  const { data: creada, error } = await supabase
    .from("categoria_insumo")
    .insert({ nombre })
    .select("id_categoria")
    .single();
  if (error || !creada) return { error: error?.message ?? "No se pudo crear la categoría." };
  return { id: creada.id_categoria };
}

/** Busca un proveedor por razón social (sin importar mayúsculas); si no existe, lo crea. Es opcional: cadena vacía = sin proveedor. */
async function resolverProveedor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nombreProveedor: string,
): Promise<{ id: number | null; error?: string }> {
  const nombre = nombreProveedor.trim();
  if (!nombre) return { id: null };

  const { data: existente } = await supabase
    .from("proveedor")
    .select("id_proveedor")
    .ilike("razon_social", nombre)
    .maybeSingle();
  if (existente) return { id: existente.id_proveedor };

  const { data: creado, error } = await supabase
    .from("proveedor")
    .insert({ razon_social: nombre })
    .select("id_proveedor")
    .single();
  if (error || !creado) return { id: null, error: error?.message ?? "No se pudo crear el proveedor." };
  return { id: creado.id_proveedor };
}

/**
 * Alta o edición de un insumo en un solo paso. El precio se carga como
 * "precio del bulto" + "peso/cantidad del bulto" — el costo unitario
 * (usado por el motor de costeo de recetas) se calcula solo. Si el
 * insumo ya existía y cambió el precio o el peso del bulto, ese cambio
 * pasa por actualizar_precio_materia_prima() para que la validación de
 * motivo obligatorio y el histórico de precios se apliquen igual que
 * desde cualquier otro camino. El resto de los campos se actualiza aparte.
 */
export async function guardarInsumo(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const idExistenteRaw = String(formData.get("id_materia_prima") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const nombreCategoria = String(formData.get("categoria") ?? "");
  const idUnidadMedida = Number(formData.get("id_unidad_medida"));
  const precioBulto = Number(formData.get("precio_bulto"));
  const cantidadBulto = Number(formData.get("cantidad_bulto"));
  const nombreProveedor = String(formData.get("proveedor") ?? "");
  const densidadRaw = String(formData.get("densidad_g_ml") ?? "").trim();
  const densidad = densidadRaw ? Number(densidadRaw) : null;
  const estado = formData.get("estado") === "true";
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!nombre) return { error: "Ingresá el nombre del insumo." };
  if (!idUnidadMedida) return { error: "Elegí la unidad de medida." };
  if (!Number.isFinite(precioBulto) || precioBulto <= 0) {
    return { error: "El precio del bulto debe ser mayor a cero." };
  }
  if (!Number.isFinite(cantidadBulto) || cantidadBulto <= 0) {
    return { error: "La cantidad/peso del bulto debe ser mayor a cero." };
  }

  const supabase = await createClient();

  const categoriaResuelta = await resolverCategoria(supabase, nombreCategoria);
  if (categoriaResuelta.error || !categoriaResuelta.id) {
    return { error: categoriaResuelta.error ?? "Elegí o cargá una categoría." };
  }

  const proveedorResuelto = await resolverProveedor(supabase, nombreProveedor);
  if (proveedorResuelto.error) return { error: proveedorResuelto.error };

  const costoUnitario = Math.round((precioBulto / cantidadBulto) * 100) / 100;

  if (!idExistenteRaw) {
    const { error } = await supabase.from("materia_prima").insert({
      nombre,
      id_categoria: categoriaResuelta.id,
      id_unidad_compra: idUnidadMedida,
      id_proveedor: proveedorResuelto.id,
      precio_bulto: precioBulto,
      cantidad_bulto: cantidadBulto,
      costo_unitario: costoUnitario,
      densidad_g_ml: densidad,
    });

    if (error) return { error: mensajeAmigable(error.code, error.message) };

    revalidatePath("/backoffice/insumos");
    return {};
  }

  const id = Number(idExistenteRaw);

  const { data: actual, error: errorActual } = await supabase
    .from("materia_prima")
    .select("precio_bulto, cantidad_bulto")
    .eq("id_materia_prima", id)
    .single();

  if (errorActual || !actual) {
    return { error: "No se pudo leer el insumo a editar." };
  }

  if (Number(actual.precio_bulto) !== precioBulto || Number(actual.cantidad_bulto) !== cantidadBulto) {
    const { error: errorPrecio } = await supabase.rpc("actualizar_precio_materia_prima", {
      p_id_materia_prima: id,
      p_precio_bulto: precioBulto,
      p_cantidad_bulto: cantidadBulto,
      p_motivo: motivo || null,
    });
    if (errorPrecio) return { error: errorPrecio.message };
  }

  const { error: errorResto } = await supabase
    .from("materia_prima")
    .update({
      nombre,
      id_categoria: categoriaResuelta.id,
      id_unidad_compra: idUnidadMedida,
      id_proveedor: proveedorResuelto.id,
      densidad_g_ml: densidad,
      estado,
    })
    .eq("id_materia_prima", id);

  if (errorResto) return { error: mensajeAmigable(errorResto.code, errorResto.message) };

  revalidatePath("/backoffice/insumos");
  return {};
}

/** Baja lógica: desactiva el insumo (Estado = Inactivo) en vez de borrarlo — un borrado real rompería el historial de precio y las recetas que ya lo usan. */
export async function desactivarInsumo(idMateriaPrima: number): Promise<EstadoFormulario> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("materia_prima")
    .update({ estado: false })
    .eq("id_materia_prima", idMateriaPrima);

  if (error) return { error: error.message };

  revalidatePath("/backoffice/insumos");
  return {};
}

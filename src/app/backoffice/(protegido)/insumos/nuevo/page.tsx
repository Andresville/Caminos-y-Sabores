import { redirect } from "next/navigation";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import BotonEnlace from "@/components/BotonEnlace";
import FormularioNuevoInsumo from "./FormularioNuevoInsumo";

export default async function PaginaNuevoInsumo() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Jefe de Compras") {
    redirect("/backoffice/insumos");
  }

  const supabase = await createClient();

  const [{ data: categorias }, { data: unidades }] = await Promise.all([
    supabase.from("categoria_insumo").select("id_categoria, nombre").eq("activa", true).order("nombre"),
    supabase.from("unidad_medida").select("id_unidad, nombre, simbolo").eq("activa", true).order("nombre"),
  ]);

  return (
    <>
      <BotonEnlace href="/backoffice/insumos" sx={{ mb: 1 }}>
        ← Insumos
      </BotonEnlace>
      <Typography variant="h4" gutterBottom>
        Nuevo insumo
      </Typography>
      <FormularioNuevoInsumo categorias={categorias ?? []} unidades={unidades ?? []} />
    </>
  );
}

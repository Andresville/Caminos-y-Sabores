import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import GaleriaMenus, { type FilaMenu } from "./GaleriaMenus";

interface MenuDb {
  id_menu: number;
  nombre_menu: string;
  descripcion: string | null;
  pax_minimo: number;
  imagen_chica_url: string | null;
  estado: boolean;
}

interface LineaMenuDb {
  id_menu: number;
  orden: number;
  receta: { nombre_plato: string } | null;
}

export default async function PaginaMenus() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol === "Ayudante de compras") {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const [{ data: menus, error }, { data: lineas }] = await Promise.all([
    supabase
      .from("menu")
      .select("id_menu, nombre_menu, descripcion, pax_minimo, imagen_chica_url, estado")
      .order("nombre_menu")
      .returns<MenuDb[]>(),
    supabase
      .from("menu_receta")
      .select("id_menu, orden, receta:id_receta ( nombre_plato )")
      .order("orden")
      .returns<LineaMenuDb[]>(),
  ]);

  const filas: FilaMenu[] = (menus ?? []).map((menu) => ({
    id_menu: menu.id_menu,
    nombre_menu: menu.nombre_menu,
    descripcion: menu.descripcion,
    pax_minimo: menu.pax_minimo,
    imagen_chica_url: menu.imagen_chica_url,
    estado: menu.estado,
    nombres_recetas: (lineas ?? [])
      .filter((linea) => linea.id_menu === menu.id_menu && linea.receta)
      .map((linea) => linea.receta!.nombre_plato),
  }));

  return (
    <Box sx={{ p: 4 }}>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          No se pudo cargar el listado: {error.message}
        </Typography>
      )}
      <GaleriaMenus menus={filas} />
    </Box>
  );
}

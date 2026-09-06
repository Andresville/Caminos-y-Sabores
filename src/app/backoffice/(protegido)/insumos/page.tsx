import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import BotonEnlace from "@/components/BotonEnlace";
import TablaInsumos, { type FilaInsumo } from "./TablaInsumos";

export default async function PaginaInsumos() {
  const supabase = await createClient();
  const usuarioActual = await obtenerUsuarioActual();
  const puedeEscribir = usuarioActual?.rol === "Jefe de Compras";

  const { data: insumos, error } = await supabase
    .from("materia_prima")
    .select(
      `id_materia_prima, nombre, costo_unitario, estado, ultima_actualizacion,
       categoria:id_categoria ( nombre ),
       unidad_compra:id_unidad_compra ( simbolo )`,
    )
    .order("nombre")
    .returns<FilaInsumo[]>();

  const { data: parametro } = await supabase
    .from("parametro_sistema")
    .select("valor")
    .eq("clave", "DIAS_ALERTA_PRECIO")
    .single();

  const diasAlerta = parametro ? Number(parametro.valor) : 30;

  return (
    <Box>
      <BotonEnlace href="/backoffice" sx={{ mb: 1 }}>
        ← Backoffice
      </BotonEnlace>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">Insumos</Typography>
        {puedeEscribir && (
          <BotonEnlace href="/backoffice/insumos/nuevo" variant="contained">
            Nuevo insumo
          </BotonEnlace>
        )}
      </Box>

      {error && <Typography color="error">No se pudo cargar el listado: {error.message}</Typography>}

      <TablaInsumos insumos={insumos ?? []} diasAlerta={diasAlerta} />
    </Box>
  );
}

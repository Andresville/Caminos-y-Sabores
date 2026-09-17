import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import BotonEnlace from "@/components/BotonEnlace";
import FormularioNuevaReceta from "./FormularioNuevaReceta";

export default async function PaginaNuevaReceta() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Ayudante de cocina") {
    redirect("/backoffice/recetas");
  }

  return (
    <>
      <EncabezadoPagina titulo="Nueva receta" />
      <Box sx={{ p: 4 }}>
        <BotonEnlace href="/backoffice/recetas" sx={{ mb: 2 }}>
          ← Recetas
        </BotonEnlace>
        <Typography color="text.secondary" gutterBottom>
          Completá los datos básicos. Después vas a poder agregar los insumos.
        </Typography>
        <FormularioNuevaReceta />
      </Box>
    </>
  );
}

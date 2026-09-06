import { redirect } from "next/navigation";
import Typography from "@mui/material/Typography";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import BotonEnlace from "@/components/BotonEnlace";
import FormularioNuevaReceta from "./FormularioNuevaReceta";

export default async function PaginaNuevaReceta() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Chef Principal") {
    redirect("/backoffice/recetas");
  }

  return (
    <>
      <BotonEnlace href="/backoffice/recetas" sx={{ mb: 1 }}>
        ← Recetas
      </BotonEnlace>
      <Typography variant="h4" gutterBottom>
        Nueva receta
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        Completá los datos básicos. Después vas a poder agregar los insumos.
      </Typography>
      <FormularioNuevaReceta />
    </>
  );
}

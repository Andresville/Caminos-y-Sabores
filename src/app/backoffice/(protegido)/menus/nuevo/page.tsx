import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import BotonEnlace from "@/components/BotonEnlace";
import FormularioNuevoMenu from "./FormularioNuevoMenu";

export default async function PaginaNuevoMenu() {
  const usuarioActual = await obtenerUsuarioActual();

  if (usuarioActual?.rol !== "Chef Principal") {
    redirect("/backoffice/menus");
  }

  return (
    <>
      <EncabezadoPagina titulo="Nuevo menú" />
      <Box sx={{ p: 4 }}>
        <BotonEnlace href="/backoffice/menus" sx={{ mb: 2 }}>
          ← Menús
        </BotonEnlace>
        <Typography color="text.secondary" gutterBottom>
          El coeficiente de venta se hereda del valor por defecto del sistema; lo ajusta Gerente Comercial
          después si corresponde.
        </Typography>
        <FormularioNuevoMenu />
      </Box>
    </>
  );
}

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import BotonEnlace from "@/components/BotonEnlace";

export default function PaginaInicioBackoffice() {
  return (
    <>
      <EncabezadoPagina titulo="Dashboard" subtitulo="Resumen general del sistema" />
      <Box sx={{ p: 4 }}>
        <Typography color="text.secondary" gutterBottom>
          Los módulos de gestión se van agregando en los próximos pasos.
        </Typography>
        <BotonEnlace href="/backoffice/insumos" variant="contained" sx={{ mt: 2 }}>
          Ir a Materias primas
        </BotonEnlace>
      </Box>
    </>
  );
}

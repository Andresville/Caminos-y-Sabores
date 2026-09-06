import Typography from "@mui/material/Typography";
import BotonEnlace from "@/components/BotonEnlace";

export default function PaginaInicioBackoffice() {
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Bienvenido
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        Esta es la pantalla de inicio del backoffice. Los módulos de gestión
        se van agregando en los próximos pasos.
      </Typography>
      <BotonEnlace href="/backoffice/insumos" variant="contained" sx={{ mt: 2 }}>
        Ir a Insumos
      </BotonEnlace>
    </>
  );
}

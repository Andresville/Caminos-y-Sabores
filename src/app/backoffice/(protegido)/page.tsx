import Typography from "@mui/material/Typography";

export default function PaginaInicioBackoffice() {
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Bienvenido
      </Typography>
      <Typography color="text.secondary">
        Esta es la pantalla de inicio del backoffice. Los módulos de gestión
        (insumos, recetas, menús, cotizaciones) se agregan en los próximos
        pasos.
      </Typography>
    </>
  );
}

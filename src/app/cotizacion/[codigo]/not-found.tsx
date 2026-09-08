import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import BarraPortal from "@/components/portal/BarraPortal";

export default function CotizacionNoEncontrada() {
  return (
    <>
      <BarraPortal mostrarNavegacion={false} />
      <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 }, textAlign: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          No encontramos ese presupuesto
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Revisá que el código esté bien escrito e intentá de nuevo.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "center" }}>
          <Button href="/cotizacion" variant="contained" size="large">
            Volver a buscar
          </Button>
          <Button href="/" variant="outlined" size="large">
            Volver al inicio
          </Button>
        </Stack>
      </Container>
    </>
  );
}

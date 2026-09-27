import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import HeaderCliente from "@/components/cliente/HeaderCliente";
import FooterCliente from "@/components/cliente/FooterCliente";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";

// Catálogo público: tiene que reflejar lo que se edita en el backoffice sin esperar un nuevo build.
export const dynamic = "force-dynamic";

export default async function PaginaInicio() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: paletaCliente.fondo }}>
      <HeaderCliente activo="inicio" />

      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Typography
          variant="h5"
          component="p"
          sx={{
            fontFamily: fuenteEncabezados,
            color: paletaCliente.textoOscuro || "text.primary",
            textAlign: "center",
          }}
        >
          Tu email ha sido confirmado exitosamente
        </Typography>
      </Box>

      <FooterCliente />
    </Box>
  );
}

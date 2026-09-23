import Box from "@mui/material/Box";
import HeaderCliente from "@/components/cliente/HeaderCliente";
import FooterCliente from "@/components/cliente/FooterCliente";
import { paletaCliente } from "@/lib/cliente-portal/paleta";
import FormularioRestablecer from "./FormularioRestablecer";

export default function PaginaRestablecer() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: paletaCliente.fondo }}>
      <HeaderCliente />
      <Box component="main" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", px: 2, py: 6 }}>
        <FormularioRestablecer />
      </Box>
      <FooterCliente />
    </Box>
  );
}

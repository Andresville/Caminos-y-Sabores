import Box from "@mui/material/Box";
import HeaderCliente from "@/components/cliente/HeaderCliente";
import FooterCliente from "@/components/cliente/FooterCliente";
import { paletaCliente } from "@/lib/cliente-portal/paleta";
import ResumenPresupuesto from "./ResumenPresupuesto";

export default function PaginaResumenPresupuesto() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: paletaCliente.fondo }}>
      <HeaderCliente />
      <Box component="main" sx={{ flex: 1 }}>
        <ResumenPresupuesto />
      </Box>
      <FooterCliente />
    </Box>
  );
}

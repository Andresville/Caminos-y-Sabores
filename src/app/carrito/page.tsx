import Box from "@mui/material/Box";
import HeaderCliente from "@/components/cliente/HeaderCliente";
import FooterCliente from "@/components/cliente/FooterCliente";
import { paletaCliente } from "@/lib/cliente-portal/paleta";
import { obtenerClienteActual } from "@/lib/cliente-actual/servidor";
import FormularioCarrito from "./FormularioCarrito";

export default async function PaginaCarrito() {
  const cliente = await obtenerClienteActual();

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: paletaCliente.fondo }}>
      <HeaderCliente />
      <Box component="main" sx={{ flex: 1 }}>
        <FormularioCarrito estaLogueado={Boolean(cliente)} />
      </Box>
      <FooterCliente />
    </Box>
  );
}

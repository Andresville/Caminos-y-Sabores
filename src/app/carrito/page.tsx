import Box from "@mui/material/Box";
import HeaderCliente from "@/components/cliente/HeaderCliente";
import FooterCliente from "@/components/cliente/FooterCliente";
import { paletaCliente } from "@/lib/cliente-portal/paleta";
import { obtenerClienteActual } from "@/lib/cliente-actual/servidor";
import { obtenerParametrosPortal, obtenerServiciosPublicos } from "@/lib/cotizador/datos";
import FormularioCarrito from "./FormularioCarrito";

export const dynamic = "force-dynamic";

export default async function PaginaCarrito() {
  const parametros = await obtenerParametrosPortal();
  const [cliente, adicionales] = await Promise.all([obtenerClienteActual(), obtenerServiciosPublicos(parametros)]);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: paletaCliente.fondo }}>
      <HeaderCliente />
      <Box component="main" sx={{ flex: 1 }}>
        <FormularioCarrito estaLogueado={Boolean(cliente)} adicionales={adicionales} />
      </Box>
      <FooterCliente />
    </Box>
  );
}

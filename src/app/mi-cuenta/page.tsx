import { redirect } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HeaderCliente from "@/components/cliente/HeaderCliente";
import FooterCliente from "@/components/cliente/FooterCliente";
import FormularioCuenta from "./FormularioCuenta";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import { obtenerClienteActual } from "@/lib/cliente-actual/servidor";
import { cerrarSesionCliente } from "@/app/(cliente)/login/actions";

export default async function PaginaMiCuenta() {
  const cliente = await obtenerClienteActual();
  if (!cliente) redirect("/login");

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: paletaCliente.fondo }}>
      <HeaderCliente />
      <Box component="main" sx={{ flex: 1, maxWidth: 700, mx: "auto", px: { xs: 2, sm: 3 }, py: 4, width: "100%" }}>
        <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 700, fontSize: "1.75rem", color: paletaCliente.textoOscuro, mb: 3 }}>
          Mi Cuenta
        </Typography>

        <FormularioCuenta cliente={cliente} />

        <Link href="/mis-presupuestos" style={{ textDecoration: "none" }}>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "white",
              border: `1px solid ${paletaCliente.borde}`,
              borderRadius: 4,
              p: 2.5,
              mt: 3,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, color: paletaCliente.textoOscuro }}>Mis Presupuestos</Typography>
              <Typography variant="body2" sx={{ color: paletaCliente.textoMuted }}>
                Ver y gestionar tus presupuestos
              </Typography>
            </Box>
            <ChevronRightIcon sx={{ color: paletaCliente.primario }} />
          </Stack>
        </Link>

        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Box component="form" action={cerrarSesionCliente}>
            <Button type="submit" color="error" size="small">
              Cerrar sesión
            </Button>
          </Box>
        </Box>
      </Box>
      <FooterCliente />
    </Box>
  );
}

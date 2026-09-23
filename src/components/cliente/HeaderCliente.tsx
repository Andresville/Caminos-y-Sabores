import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { obtenerClienteActual } from "@/lib/cliente-actual/servidor";
import { paletaCliente, fuenteEncabezados } from "@/lib/cliente-portal/paleta";
import AccionesHeader from "./AccionesHeader";

type NavActivo = "inicio" | "mis-presupuestos";

/** Nota RSC: nunca pasar Link como prop `component` de un componente MUI desde un Server Component (rompe la serialización) — por eso Link envuelve directamente, con el contenido de MUI adentro. */
export default async function HeaderCliente({ activo }: { activo?: NavActivo }) {
  const cliente = await obtenerClienteActual();

  const estiloLink = (esActivo: boolean): React.CSSProperties => ({
    fontSize: 14,
    fontWeight: 500,
    color: esActivo ? paletaCliente.primario : paletaCliente.textoSecundario,
    borderBottom: esActivo ? `2px solid ${paletaCliente.primario}` : "2px solid transparent",
    paddingBottom: 2,
    textDecoration: "none",
  });

  return (
    <Box
      component="header"
      sx={{
        bgcolor: "white",
        borderBottom: `1px solid ${paletaCliente.borde}`,
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <Stack
        direction="row"
        sx={{
          maxWidth: 1280,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          height: 64,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor: paletaCliente.primario,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontFamily: fuenteEncabezados,
              }}
            >
              S
            </Box>
            <Typography sx={{ fontFamily: fuenteEncabezados, fontWeight: 600, color: paletaCliente.textoOscuro }}>
              Sabores &amp; Eventos
            </Typography>
          </Stack>
        </Link>

        <Stack direction="row" spacing={4} sx={{ display: { xs: "none", md: "flex" } }}>
          <Link href="/" style={estiloLink(activo === "inicio")}>
            Inicio
          </Link>
          <Link href={cliente ? "/mis-presupuestos" : "/login"} style={estiloLink(activo === "mis-presupuestos")}>
            Mis Presupuestos
          </Link>
        </Stack>

        <AccionesHeader cliente={cliente} />
      </Stack>
    </Box>
  );
}

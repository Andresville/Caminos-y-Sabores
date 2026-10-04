import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/usuario-actual/servidor";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import { obtenerHistoricoPrecio } from "../../actions";

export default async function PaginaHistorialPrecio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuarioActual = await obtenerUsuarioActual();

  const rolesConAcceso = ["Asistente Comercial", "Administrador"];
  if (!usuarioActual || !rolesConAcceso.includes(usuarioActual.rol)) {
    redirect("/backoffice/insumos");
  }

  const supabase = await createClient();
  const idMateriaPrima = Number(id);

  const [{ data: insumo }, historico] = await Promise.all([
    supabase.from("materia_prima").select("nombre").eq("id_materia_prima", idMateriaPrima).maybeSingle(),
    obtenerHistoricoPrecio(idMateriaPrima),
  ]);

  if (!insumo) notFound();

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
        <Link href="/backoffice/insumos" style={{ color: "inherit", textDecoration: "none" }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
            <ArrowBackIcon fontSize="small" />
            <Typography variant="body2">Volver</Typography>
          </Stack>
        </Link>
        <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>
          Historial de precio — {insumo.nombre}
        </Typography>
      </Stack>

      {historico.length === 0 ? (
        <Typography color="text.secondary">Todavía no hay cambios de precio registrados para este insumo.</Typography>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            overflowX: "auto",
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": { height: 10 },
            "&::-webkit-scrollbar-thumb": { bgcolor: "grey.400", borderRadius: 5 },
          }}
        >
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>FECHA</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  PRECIO POR BULTO
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  PESO DEL BULTO
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  PRECIO UNITARIO
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  VARIACIÓN
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>USUARIO</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>MOTIVO</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historico.map((fila) => {
                const precioUnitario = fila.precio_bulto_nuevo / fila.cantidad_bulto_nuevo;
                return (
                  <TableRow key={fila.id_historico} hover>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {formatoFecha.format(new Date(fila.fecha_cambio))}
                    </TableCell>
                    <TableCell align="right">
                      {formatoMoneda.format(fila.precio_bulto_anterior)} → {formatoMoneda.format(fila.precio_bulto_nuevo)}
                    </TableCell>
                    <TableCell align="right">
                      {fila.cantidad_bulto_anterior} → {fila.cantidad_bulto_nuevo}
                    </TableCell>
                    <TableCell align="right">{formatoMoneda.format(precioUnitario)}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 600,
                        color:
                          fila.variacion_pct > 0
                            ? "error.main"
                            : fila.variacion_pct < 0
                              ? "success.main"
                              : "text.secondary",
                      }}
                    >
                      {fila.variacion_pct > 0 ? "+" : ""}
                      {fila.variacion_pct}%
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{fila.nombre_usuario ?? "—"}</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{fila.motivo ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}

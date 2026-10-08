import Link from "next/link";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { formatoFecha, formatoMoneda } from "@/lib/formato";
import { COLOR_ESTADO_INSUMO } from "../eventos/mapeo";

export interface FilaCompra {
  id_evento: number;
  nombreEvento: string;
  fechaEvento: string;
  costoEstimado: number;
  listaCompleta: boolean;
}

export default function TablaCompras({ compras }: { compras: FilaCompra[] }) {
  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontFamily: "Georgia, serif", fontWeight: 700, mb: 3 }}>
        Compras pendientes
      </Typography>

      {compras.length === 0 ? (
        <Typography color="text.secondary">No hay eventos con compras pendientes.</Typography>
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
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>EVENTO</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>FECHA</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>ESTADO DE LA LISTA</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  COSTO ESTIMADO
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                  ACCIONES
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {compras.map((compra) => {
                const color = compra.listaCompleta ? COLOR_ESTADO_INSUMO.COMPRADO : COLOR_ESTADO_INSUMO.PENDIENTE;
                return (
                  <TableRow key={compra.id_evento} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{compra.nombreEvento}</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {formatoFecha.format(new Date(compra.fechaEvento))}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={compra.listaCompleta ? "Completa" : "Pendiente"}
                        size="small"
                        sx={{ bgcolor: color.bg, color: color.fg, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatoMoneda.format(compra.costoEstimado)}
                    </TableCell>
                    <TableCell align="right">
                      <Link href={`/backoffice/compras/${compra.id_evento}`} style={{ textDecoration: "none" }}>
                        <Typography component="span" variant="body2" sx={{ color: "primary.main" }}>
                          Ver lista →
                        </Typography>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </>
  );
}

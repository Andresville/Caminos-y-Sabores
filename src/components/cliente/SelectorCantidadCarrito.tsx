"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { paletaCliente } from "@/lib/cliente-portal/paleta";
import { useCarrito, type TipoItemCarrito } from "@/lib/carrito-cliente/CarritoProvider";

export default function SelectorCantidadCarrito({
  tipoItem,
  idReferencia,
  nombre,
  imagenUrl,
  etiquetaCantidad,
  cantidadMinima,
}: {
  tipoItem: TipoItemCarrito;
  idReferencia: number;
  nombre: string;
  imagenUrl: string | null;
  etiquetaCantidad: string;
  cantidadMinima: number;
}) {
  const { agregar } = useCarrito();
  const router = useRouter();
  const [cantidad, setCantidad] = useState(cantidadMinima);
  const [agregado, setAgregado] = useState(false);

  function agregarAlCarrito() {
    agregar({ tipoItem, idReferencia, nombre, imagenUrl, cantidadMinima }, cantidad);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <Typography variant="body2" sx={{ color: paletaCliente.textoOscuro, fontWeight: 500 }}>
          {etiquetaCantidad}
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <IconButton
            onClick={() => setCantidad((valor) => Math.max(cantidadMinima, valor - 1))}
            sx={{ bgcolor: paletaCliente.fondoClaro, color: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.borde } }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ width: 32, textAlign: "center", fontWeight: 700 }}>{cantidad}</Typography>
          <IconButton
            onClick={() => setCantidad((valor) => valor + 1)}
            sx={{ bgcolor: paletaCliente.fondoClaro, color: paletaCliente.primario, "&:hover": { bgcolor: paletaCliente.borde } }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Button
        onClick={agregarAlCarrito}
        variant="contained"
        size="large"
        sx={{
          bgcolor: agregado ? "success.main" : paletaCliente.primario,
          "&:hover": { bgcolor: agregado ? "success.dark" : paletaCliente.primarioOscuro },
        }}
      >
        {agregado ? "¡Agregado al carrito!" : "Agregar al carrito"}
      </Button>

      {agregado && (
        <Button
          onClick={() => router.push("/carrito")}
          variant="outlined"
          sx={{ borderColor: paletaCliente.primario, color: paletaCliente.primario }}
        >
          Ver carrito →
        </Button>
      )}
    </Stack>
  );
}

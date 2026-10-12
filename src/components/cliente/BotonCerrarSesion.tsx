"use client";

import Button from "@mui/material/Button";
import { useCarrito } from "@/lib/carrito-cliente/CarritoProvider";
import { cerrarSesionCliente } from "@/app/(cliente)/login/actions";

export default function BotonCerrarSesion() {
  const { reiniciarCarrito } = useCarrito();

  return (
    <Button
      color="error"
      size="small"
      onClick={() => {
        reiniciarCarrito();
        cerrarSesionCliente();
      }}
    >
      Cerrar sesión
    </Button>
  );
}

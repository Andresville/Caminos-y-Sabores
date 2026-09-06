"use client";

import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import { createClient } from "@/lib/supabase/client";

export default function CerrarSesionBoton() {
  const router = useRouter();

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/backoffice/login");
    router.refresh();
  }

  return (
    <Button color="inherit" onClick={cerrarSesion}>
      Cerrar sesión
    </Button>
  );
}

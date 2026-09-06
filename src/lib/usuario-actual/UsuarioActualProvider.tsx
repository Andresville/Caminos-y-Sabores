"use client";

import { createContext, useContext } from "react";

export interface UsuarioActual {
  nombreCompleto: string;
  rol: string;
}

const UsuarioActualContext = createContext<UsuarioActual | null>(null);

export function UsuarioActualProvider({
  value,
  children,
}: {
  value: UsuarioActual;
  children: React.ReactNode;
}) {
  return <UsuarioActualContext.Provider value={value}>{children}</UsuarioActualContext.Provider>;
}

export function useUsuarioActual(): UsuarioActual {
  const contexto = useContext(UsuarioActualContext);
  if (!contexto) {
    throw new Error("useUsuarioActual debe usarse dentro de UsuarioActualProvider");
  }
  return contexto;
}

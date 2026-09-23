"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type TipoItemCarrito = "MENU" | "RECETA" | "ADICIONAL";

export interface ItemCarrito {
  tipoItem: TipoItemCarrito;
  idReferencia: number;
  nombre: string;
  imagenUrl: string | null;
  cantidad: number;
}

interface CarritoContextType {
  items: ItemCarrito[];
  cargado: boolean;
  agregar: (item: Omit<ItemCarrito, "cantidad">, cantidad?: number) => void;
  quitar: (tipoItem: TipoItemCarrito, idReferencia: number) => void;
  actualizarCantidad: (tipoItem: TipoItemCarrito, idReferencia: number, cantidad: number) => void;
  vaciar: () => void;
}

const CLAVE_STORAGE = "caminos-y-sabores:carrito";

const CarritoContext = createContext<CarritoContextType | null>(null);

function claveItem(tipoItem: TipoItemCarrito, idReferencia: number): string {
  return `${tipoItem}-${idReferencia}`;
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    // Hidratación deliberada desde localStorage: en el server no existe, así
    // que arranca vacío a propósito (sin mismatch) y recién acá, ya en el
    // cliente, se carga el valor real — no hay forma de saberlo antes.
    try {
      const guardado = window.localStorage.getItem(CLAVE_STORAGE);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (guardado) setItems(JSON.parse(guardado));
    } catch {
      // localStorage puede no estar disponible (modo privado, etc.); el carrito arranca vacío.
    }
    setCargado(true);
  }, []);

  useEffect(() => {
    if (!cargado) return;
    try {
      window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items));
    } catch {
      // Igual que arriba: si no se puede persistir, el carrito sigue funcionando solo en memoria.
    }
  }, [items, cargado]);

  function agregar(item: Omit<ItemCarrito, "cantidad">, cantidad = 1) {
    setItems((actual) => {
      const clave = claveItem(item.tipoItem, item.idReferencia);
      const existente = actual.find((i) => claveItem(i.tipoItem, i.idReferencia) === clave);
      if (existente) {
        return actual.map((i) =>
          claveItem(i.tipoItem, i.idReferencia) === clave ? { ...i, cantidad: i.cantidad + cantidad } : i,
        );
      }
      return [...actual, { ...item, cantidad }];
    });
  }

  function quitar(tipoItem: TipoItemCarrito, idReferencia: number) {
    setItems((actual) => actual.filter((i) => claveItem(i.tipoItem, i.idReferencia) !== claveItem(tipoItem, idReferencia)));
  }

  function actualizarCantidad(tipoItem: TipoItemCarrito, idReferencia: number, cantidad: number) {
    if (cantidad <= 0) {
      quitar(tipoItem, idReferencia);
      return;
    }
    setItems((actual) =>
      actual.map((i) =>
        claveItem(i.tipoItem, i.idReferencia) === claveItem(tipoItem, idReferencia) ? { ...i, cantidad } : i,
      ),
    );
  }

  function vaciar() {
    setItems([]);
  }

  return (
    <CarritoContext.Provider value={{ items, cargado, agregar, quitar, actualizarCantidad, vaciar }}>
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito(): CarritoContextType {
  const contexto = useContext(CarritoContext);
  if (!contexto) throw new Error("useCarrito debe usarse dentro de CarritoProvider");
  return contexto;
}

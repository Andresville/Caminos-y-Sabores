"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { DesgloseCarrito } from "@/lib/cotizador/calculo";

export type TipoItemCarrito = "MENU" | "RECETA" | "ADICIONAL";

export interface ItemCarrito {
  tipoItem: TipoItemCarrito;
  idReferencia: number;
  nombre: string;
  imagenUrl: string | null;
  cantidadMinima: number;
  cantidad: number;
}

/** Un servicio adicional elegido en el carrito. cantidadPersonas solo aplica a los de tipo POR_PERSONA (no todos los invitados beben o son mayores de edad, por ejemplo) — en el resto se ignora. */
export interface AdicionalSeleccionado {
  idAdicional: number;
  cantidadPersonas?: number;
}

/** Datos del presupuesto ya creado como PENDIENTE en la base (ver crearPresupuestoPendiente), guardados en el navegador para mostrar el resumen sin tener que volver a pedirlo. */
export interface PedidoPendiente {
  idCotizacion: number;
  nombreEvento: string;
  fechaEvento: string;
  cantidadComensales: number;
  adicionalesSeleccionados: AdicionalSeleccionado[];
  desglose: DesgloseCarrito;
}

/** Borrador del formulario de "Solicitar presupuesto", guardado mientras el cliente va a loguearse/registrarse (antes de ver el estimado) y vuelve. */
export interface BorradorPedido {
  nombreEvento: string;
  fechaEvento: string;
  cantidadComensales: string;
  adicionalesSeleccionados: AdicionalSeleccionado[];
}

interface CarritoContextType {
  items: ItemCarrito[];
  pedidoPendiente: PedidoPendiente | null;
  borrador: BorradorPedido | null;
  cargado: boolean;
  agregar: (item: Omit<ItemCarrito, "cantidad">, cantidad?: number) => void;
  quitar: (tipoItem: TipoItemCarrito, idReferencia: number) => void;
  actualizarCantidad: (tipoItem: TipoItemCarrito, idReferencia: number, cantidad: number) => void;
  vaciar: () => void;
  guardarPedidoPendiente: (pedido: PedidoPendiente) => void;
  limpiarPedidoPendiente: () => void;
  guardarBorrador: (borrador: BorradorPedido) => void;
  limpiarBorrador: () => void;
}

const CLAVE_STORAGE = "caminos-y-sabores:carrito";
const CLAVE_STORAGE_PEDIDO = "caminos-y-sabores:pedido-pendiente";
const CLAVE_STORAGE_BORRADOR = "caminos-y-sabores:borrador-pedido";

const CarritoContext = createContext<CarritoContextType | null>(null);

function claveItem(tipoItem: TipoItemCarrito, idReferencia: number): string {
  return `${tipoItem}-${idReferencia}`;
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [pedidoPendiente, setPedidoPendiente] = useState<PedidoPendiente | null>(null);
  const [borrador, setBorrador] = useState<BorradorPedido | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    // Hidratación deliberada desde localStorage: en el server no existe, así
    // que arranca vacío a propósito (sin mismatch) y recién acá, ya en el
    // cliente, se carga el valor real — no hay forma de saberlo antes.
    try {
      const guardado = window.localStorage.getItem(CLAVE_STORAGE);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (guardado) setItems(JSON.parse(guardado));
      const guardadoPedido = window.localStorage.getItem(CLAVE_STORAGE_PEDIDO);
      if (guardadoPedido) setPedidoPendiente(JSON.parse(guardadoPedido));
      const guardadoBorrador = window.localStorage.getItem(CLAVE_STORAGE_BORRADOR);
      if (guardadoBorrador) setBorrador(JSON.parse(guardadoBorrador));
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

  useEffect(() => {
    if (!cargado) return;
    try {
      if (pedidoPendiente) {
        window.localStorage.setItem(CLAVE_STORAGE_PEDIDO, JSON.stringify(pedidoPendiente));
      } else {
        window.localStorage.removeItem(CLAVE_STORAGE_PEDIDO);
      }
    } catch {
      // Igual que arriba: si no se puede persistir, sigue funcionando solo en memoria.
    }
  }, [pedidoPendiente, cargado]);

  useEffect(() => {
    if (!cargado) return;
    try {
      if (borrador) {
        window.localStorage.setItem(CLAVE_STORAGE_BORRADOR, JSON.stringify(borrador));
      } else {
        window.localStorage.removeItem(CLAVE_STORAGE_BORRADOR);
      }
    } catch {
      // Igual que arriba: si no se puede persistir, sigue funcionando solo en memoria.
    }
  }, [borrador, cargado]);

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
    setItems((actual) =>
      actual.map((i) =>
        claveItem(i.tipoItem, i.idReferencia) === claveItem(tipoItem, idReferencia)
          ? { ...i, cantidad: Math.max(i.cantidadMinima, cantidad) }
          : i,
      ),
    );
  }

  function vaciar() {
    setItems([]);
  }

  function guardarPedidoPendiente(pedido: PedidoPendiente) {
    setPedidoPendiente(pedido);
  }

  function limpiarPedidoPendiente() {
    setPedidoPendiente(null);
  }

  function guardarBorrador(datos: BorradorPedido) {
    setBorrador(datos);
  }

  function limpiarBorrador() {
    setBorrador(null);
  }

  return (
    <CarritoContext.Provider
      value={{
        items,
        pedidoPendiente,
        borrador,
        cargado,
        agregar,
        quitar,
        actualizarCantidad,
        vaciar,
        guardarPedidoPendiente,
        limpiarPedidoPendiente,
        guardarBorrador,
        limpiarBorrador,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito(): CarritoContextType {
  const contexto = useContext(CarritoContext);
  if (!contexto) throw new Error("useCarrito debe usarse dentro de CarritoProvider");
  return contexto;
}

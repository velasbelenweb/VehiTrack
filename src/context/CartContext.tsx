"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type CartItem = {
  slug: string;
  nombre: string;
  precio: number;
  imagen: string;
  cantidad: number;
  varianteId?: string;
  varianteNombre?: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cantidad">, cantidad?: number) => void;
  removeItem: (slug: string, varianteId?: string) => void;
  updateQuantity: (slug: string, cantidad: number, varianteId?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "belen-carrito";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Cargar carrito guardado al montar (solo en cliente)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // localStorage no disponible o datos corruptos: seguimos con carrito vacío
    }
    setHydrated(true);
  }, []);

  // Guardar cada vez que cambie
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // almacenamiento lleno o bloqueado: ignoramos, el carrito sigue en memoria
    }
  }, [items, hydrated]);

  function addItem(item: Omit<CartItem, "cantidad">, cantidad = 1) {
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.slug === item.slug && i.varianteId === item.varianteId
      );
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx] = { ...copia[idx], cantidad: copia[idx].cantidad + cantidad };
        return copia;
      }
      return [...prev, { ...item, cantidad }];
    });
  }

  function removeItem(slug: string, varianteId?: string) {
    setItems((prev) =>
      prev.filter((i) => !(i.slug === slug && i.varianteId === varianteId))
    );
  }

  function updateQuantity(slug: string, cantidad: number, varianteId?: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.slug === slug && i.varianteId === varianteId
          ? { ...i, cantidad: Math.max(1, cantidad) }
          : i
      )
    );
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = useMemo(
    () => items.reduce((acc, i) => acc + i.cantidad, 0),
    [items]
  );
  const totalPrice = useMemo(
    () => items.reduce((acc, i) => acc + i.cantidad * i.precio, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}

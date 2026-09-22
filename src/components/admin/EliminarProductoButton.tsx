"use client";

import { useTransition } from "react";

export default function EliminarProductoButton({
  id,
  action,
}: {
  id: string;
  action: (id: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) {
      return;
    }
    startTransition(() => action(id));
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-sm text-red-600 hover:underline disabled:opacity-40"
    >
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}

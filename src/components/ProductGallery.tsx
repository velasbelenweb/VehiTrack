"use client";

import { useState } from "react";

export default function ProductGallery({
  imagenes,
  alt,
}: {
  imagenes: string[];
  alt: string;
}) {
  const [activa, setActiva] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imagenes[activa]}
        alt={alt}
        className="aspect-square w-full rounded-2xl object-cover"
      />
      {imagenes.length > 1 && (
        <div className="flex gap-3">
          {imagenes.map((src, i) => (
            <button
              key={src}
              onClick={() => setActiva(i)}
              className={`h-20 w-20 overflow-hidden rounded-xl border-2 transition-colors ${
                i === activa ? "border-ink" : "border-ink/15 hover:border-ink/40"
              }`}
              aria-label={`Ver foto ${i + 1} de ${alt}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";

export type RevealVariant =
  | "fade-up"
  | "scale-in"
  | "wipe-left"
  | "wipe-right"
  | "curtain";

interface CinematicRevealProps {
  children: ReactNode;
  /** Estilo de la transición cinemática al entrar en pantalla. */
  variant?: RevealVariant;
  /** Retraso en ms, útil para escalonar varios elementos dentro de una sección. */
  delay?: number;
  className?: string;
  /** Elemento HTML en el que se renderiza (section, div, article...). */
  as?: ElementType;
}

const hiddenStyles: Record<RevealVariant, string> = {
  "fade-up": "opacity-0 translate-y-20",
  "scale-in": "opacity-0 scale-90",
  "wipe-left": "opacity-0 [clip-path:inset(0_100%_0_0)]",
  "wipe-right": "opacity-0 [clip-path:inset(0_0_0_100%)]",
  curtain: "opacity-0 [clip-path:inset(0_0_100%_0)]",
};

const visibleStyles: Record<RevealVariant, string> = {
  "fade-up": "opacity-100 translate-y-0",
  "scale-in": "opacity-100 scale-100",
  "wipe-left": "opacity-100 [clip-path:inset(0_0%_0_0)]",
  "wipe-right": "opacity-100 [clip-path:inset(0_0_0_0%)]",
  curtain: "opacity-100 [clip-path:inset(0_0_0%_0)]",
};

/**
 * Envuelve una sección/elemento y le aplica una transición estilo "película"
 * (fundido, cortinilla o barrido) cuando entra en el viewport. Respeta
 * prefers-reduced-motion mostrando el contenido sin animar.
 */
export default function CinematicReveal({
  children,
  variant = "fade-up",
  delay = 0,
  className = "",
  as: Tag = "div",
}: CinematicRevealProps) {
  const ref = useRef<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform transition-all duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
        visible ? visibleStyles[variant] : hiddenStyles[variant]
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

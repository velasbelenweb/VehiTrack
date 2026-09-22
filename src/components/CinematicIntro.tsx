"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "brl-intro-shown";

/**
 * Intro estilo "cortinas de cine": dos paneles oscuros que se abren hacia los
 * costados revelando el sitio, con el logo apareciendo brevemente en el
 * centro. Se muestra una sola vez por sesión de navegación y respeta
 * prefers-reduced-motion.
 */
export default function CinematicIntro() {
  const [closing, setClosing] = useState(true);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (alreadyShown || reduceMotion) {
      return;
    }

    sessionStorage.setItem(SESSION_KEY, "1");
    setHidden(false);

    const openTimer = setTimeout(() => setClosing(false), 650);
    const removeTimer = setTimeout(() => setHidden(true), 1850);

    return () => {
      clearTimeout(openTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (hidden) return null;

  return (
    <div aria-hidden="true" className="fixed inset-0 z-[100] flex">
      <div
        className={`pointer-events-auto h-full w-1/2 bg-ink transition-transform duration-[1100ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
          closing ? "translate-x-0" : "-translate-x-full"
        }`}
      />
      <div
        className={`pointer-events-auto h-full w-1/2 bg-ink transition-transform duration-[1100ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
          closing ? "translate-x-0" : "translate-x-full"
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
          closing ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt=""
          className="h-16 w-auto object-contain md:h-20"
        />
      </div>
    </div>
  );
}

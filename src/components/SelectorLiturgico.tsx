"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, ChevronRight, MessageCircle } from "lucide-react";
import { slugify } from "@/lib/products";

/* ============================================================
   ÁRBOL DE CATEGORÍAS
   ------------------------------------------------------------
   Refleja el orden de "Líneas y productos" del negocio: cada
   línea principal (Veladoras, Velones, Cirios, Velas) se
   organiza primero por diseño/advocación —San Rafael, Cinco
   Estrellas, Celeste, Sagrado Corazón de Jesús, Otros— y dentro
   de cada una van sus referencias propias.

   Cada referencia final es, en teoría, un producto individual
   con su propio precio (~200 combinaciones en total). Como no
   existen todavía como productos reales, cada hoja recibe un
   "productSlug" con un nombre predecible (ver slugify más abajo).
   El selector revisa en tiempo real (prop slugsExistentes) si ya
   fue creado desde el panel Admin con ese slug exacto:
     - si existe -> lleva directo a la ficha del producto real
     - si no existe todavía -> cae a "consultar por WhatsApp"
   Así no hay que tocar este código cada vez que agreguen un
   producto: solo hay que usar el slug indicado al crearlo.
============================================================ */

type CatalogNode = {
  id: string;
  label: string;
  children?: CatalogNode[];
  /** Slug esperado del producto real (ver nota arriba). Si existe en
   * slugsExistentes, la hoja navega a /producto/[slug] en vez de mostrar
   * la pantalla de "consultar por WhatsApp". */
  productSlug?: string;
  /** Foto de referencia a mostrar en la pantalla de "consultar por
   * WhatsApp" mientras el producto real todavía no existe en el catálogo. */
  previewImage?: string;
};

// Las 5 líneas/advocaciones que agrupan Veladoras, Velones, Cirios y Velas.
const LINEAS = ["San Rafael", "Cinco Estrellas", "Celeste", "Sagrado Corazón de Jesús", "Otros"];

const sizes = (prefix: string, values: string[]): CatalogNode[] =>
  values.map((v) => ({ id: `${prefix}-${v}`, label: v }));

const VELON_REFS = [
  "05", "06", "07", "7.5", "8", "8.5", "9", "9.5",
  "10", "11", "12", "14", "15", "18", "19", "20", "25", "27", "29",
];
const VELA_TIPOS = ["Farol", "Pequeña", "Mediana", "Grande", "Decorativas – ocasión especial"];
const CIRIO_TRADICIONALES = ["Dos y medio", "Centimento", "Farol"];
const CIRIO_ESPECIALES = ["Pascualito", "Pascual", "Gloria", "Una libra", "Dos libras", "Metro y medio"];
const CIRIO_OCACION = ["Bautizo", "Primera comunión", "Confirmación"];

// -- Generadores: una función por línea de producto (Veladoras/Velones/
// Cirios/Velas), cada una repitiendo la misma estructura para las 5 líneas.

// Diseños de la línea "Especial" que todavía no existen como producto real
// (sin precio ni foto propia) — llevan a "consultar por WhatsApp".
const ESPECIAL_DISENOS = [
  "Santa Marta",
  "Oración a San Alejo",
  "Las 7 Potencias",
  "Oración a Juan del Dinero",
  "Prosperidad",
  "Don Juan del Volteo",
  "Oración del Pensamiento",
  "Justo Juez",
  "Desespero",
  "San Marcos de León",
  "Destrancadera",
  "Las Tres Potencias",
  "Virgen de Guadalupe",
  "Virgen del Carmen",
  "San Miguel Arcángel",
  "Oración el Dominio",
  "Señor de Monserrate",
  "San Pancracio",
  "Cera de Abejas",
  "Arcángel San Gabriel",
];

function veladorasPorLinea(): CatalogNode[] {
  return LINEAS.map((linea) => {
    const ls = slugify(linea);
    const especialSlug = `veladora-no-1-especial-${ls}`;
    return {
      id: `veladora-${ls}`,
      label: linea,
      children: [
        {
          id: `veladora-${ls}-no1`,
          label: "Veladora No. 1",
          productSlug: `veladora-no-1-${ls}`,
          previewImage: "/productos/veladora-no-1.jpg",
        },
        {
          id: `veladora-${ls}-especial`,
          label: "Especial",
          children: [
            {
              id: `veladora-${ls}-especial-oro`,
              label: "Oro",
              productSlug: especialSlug,
              previewImage: "/productos/veladora-especial-oro.jpg",
            },
            {
              id: `veladora-${ls}-especial-plata`,
              label: "Plata",
              productSlug: especialSlug,
              previewImage: "/productos/veladora-especial-plata.jpg",
            },
            ...ESPECIAL_DISENOS.map((d) => ({
              id: `veladora-${ls}-especial-${slugify(d)}`,
              label: d,
            })),
          ],
        },
      ],
    };
  });
}

function velonesPorLinea(): CatalogNode[] {
  return LINEAS.map((linea) => {
    const ls = slugify(linea);
    return {
      id: `velon-${ls}`,
      label: linea,
      children: VELON_REFS.map((n) => ({
        id: `velon-${ls}-${n}`,
        label: `Velón No. ${n}`,
        productSlug: `velon-no-${slugify(n)}-${ls}`,
      })),
    };
  });
}

function ciriosPorLinea(): CatalogNode[] {
  return LINEAS.map((linea) => {
    const ls = slugify(linea);
    return {
      id: `cirio-${ls}`,
      label: linea,
      children: [
        {
          id: `cirio-${ls}-tradicionales`,
          label: "Tradicionales",
          children: CIRIO_TRADICIONALES.map((t) => ({
            id: `cirio-${ls}-trad-${slugify(t)}`,
            label: t,
            productSlug: `cirio-${slugify(t)}-${ls}`,
          })),
        },
        {
          id: `cirio-${ls}-especiales`,
          label: "Especiales",
          children: CIRIO_ESPECIALES.map((t) => ({
            id: `cirio-${ls}-esp-${slugify(t)}`,
            label: t,
            productSlug: `cirio-${slugify(t)}-${ls}`,
          })),
        },
        {
          id: `cirio-${ls}-ocacion`,
          label: "Ocación",
          children: CIRIO_OCACION.map((t) => ({
            id: `cirio-${ls}-oca-${slugify(t)}`,
            label: t,
            productSlug: `cirio-${slugify(t)}-${ls}`,
          })),
        },
      ],
    };
  });
}

function velasPorLinea(): CatalogNode[] {
  return LINEAS.map((linea) => {
    const ls = slugify(linea);
    return {
      id: `vela-${ls}`,
      label: linea,
      children: VELA_TIPOS.map((t) => ({
        id: `vela-${ls}-${slugify(t)}`,
        label: t,
        productSlug: `vela-${slugify(t)}-${ls}`,
      })),
    };
  });
}

const CATALOG_TREE: CatalogNode[] = [
  { id: "veladoras", label: "1. Veladoras", children: veladorasPorLinea() },
  { id: "velones", label: "2. Velones", children: velonesPorLinea() },
  { id: "cirios", label: "3. Cirios", children: ciriosPorLinea() },
  { id: "velas", label: "4. Velas", children: velasPorLinea() },
  {
    id: "desahumerios",
    label: "5. Desahumerios",
    children: [
      {
        id: "desahumerio-sagrado",
        label: "Sagrado",
        children: [
          { id: "desahumerio-sagrado-grande", label: "Grande" },
          { id: "desahumerio-sagrado-pequeno", label: "Pequeño" },
        ],
      },
      {
        id: "desahumerio-incienso",
        label: "Incienso",
        children: [
          { id: "desahumerio-incienso-grande", label: "Grande" },
          { id: "desahumerio-incienso-pequeno", label: "Pequeño" },
        ],
      },
      { id: "desahumerio-caja", label: "Caja" },
      { id: "desahumerio-tabaco", label: "Tabaco" },
      { id: "desahumerio-chino", label: "Chino" },
    ],
  },
  {
    id: "libros",
    label: "6. Libros",
    children: [
      {
        id: "libro-novenas",
        label: "Novenas",
        children: [
          { id: "novena-normal", label: "Normal" },
          { id: "novena-biblica", label: "Bíblicas" },
        ],
      },
      {
        id: "libro-biblias",
        label: "Biblias",
        children: [
          { id: "biblia-ninos", label: "Niños / niña" },
          { id: "biblia-adultos", label: "Adultos" },
        ],
      },
    ],
  },
  {
    id: "camandulas",
    label: "7. Camándulas",
    children: [
      {
        id: "camandula-madera",
        label: "Madera",
        children: [
          { id: "camandula-madera-nino", label: "Niño" },
          { id: "camandula-madera-nina", label: "Niña" },
        ],
      },
      {
        id: "camandula-acero",
        label: "Acero",
        children: [
          { id: "camandula-acero-nino", label: "Niño" },
          { id: "camandula-acero-nina", label: "Niña" },
        ],
      },
    ],
  },
  {
    id: "acero",
    label: "8. Productos en acero",
    children: [
      { id: "acero-dijes", label: "Dijes" },
      { id: "acero-camandulas", label: "Camándulas" },
      { id: "acero-anillos", label: "Anillos" },
      { id: "acero-cadenas", label: "Cadenas" },
    ],
  },
  {
    id: "articulos-religiosos",
    label: "9. Artículos religiosos",
    children: [
      { id: "art-incensarios", label: "Incensarios" },
      { id: "art-faroles", label: "Faroles" },
    ],
  },
  {
    id: "fiestas",
    label: "10. Fiestas y otros",
    children: [
      {
        id: "fiestas-faroles",
        label: "Faroles",
        children: [
          { id: "farol-papel", label: "Papel" },
          { id: "farol-madera", label: "Madera" },
          { id: "farol-metal", label: "Metal" },
        ],
      },
    ],
  },
  {
    id: "candelabros",
    label: "11. Candelabros",
    children: [
      { id: "candelabro-vidrio", label: "Vidrio" },
      { id: "candelabro-metal", label: "Metal" },
    ],
  },
  { id: "imagenes", label: "12. Imágenes religiosas" },
  {
    id: "otros",
    label: "13. Otros",
    children: [
      { id: "otros-alcancias", label: "Alcancías" },
      { id: "otros-naturales", label: "Productos naturales" },
    ],
  },
];

const ROOT: CatalogNode = { id: "root", label: "Catálogo", children: CATALOG_TREE };

/* ============================================================
   HISTORIAL DE CONSULTAS RECIENTES (localStorage del navegador)
============================================================ */
type HistoryEntry = { labels: string[]; at: number };
const HISTORY_KEY = "belen-selector-historial";

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // almacenamiento lleno o bloqueado: seguimos sin persistir el historial
  }
}

/* ============================================================
   TRANSICIÓN SUAVE ENTRE PANTALLAS
============================================================ */
function Fade({ screenKey, children }: { screenKey: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, [screenKey]);
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(10px)",
        transition:
          "opacity 480ms cubic-bezier(.22,.68,0,1), transform 480ms cubic-bezier(.22,.68,0,1)",
      }}
    >
      {children}
    </div>
  );
}

type Screen = "landing" | "browse" | "result";

function whatsappHref(labels: string[]) {
  const text = encodeURIComponent(
    `Hola, quiero consultar disponibilidad y precio de: ${labels.join(" › ")}`
  );
  return `https://wa.me/?text=${text}`;
}

/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */
export default function SelectorLiturgico({
  embedded = false,
  slugsExistentes = [],
}: {
  /** true cuando se usa flotando sobre otra imagen (ej. el hero del home)
   * en vez de como página completa propia. */
  embedded?: boolean;
  /** Slugs de productos que ya existen en la base de datos real. Se usa
   * para decidir si una hoja del árbol lleva a su ficha real o, si el
   * producto todavía no fue creado en el Admin, a "consultar por WhatsApp". */
  slugsExistentes?: string[];
} = {}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("landing");
  const [path, setPath] = useState<CatalogNode[]>([ROOT]);
  const [selection, setSelection] = useState<CatalogNode | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setHistory(loadHistory());
    return () => clearTimeout(toastTimer.current);
  }, []);

  const current = path[path.length - 1];
  const breadcrumbLabels = path.slice(1).map((n) => n.label);

  function openCatalog() {
    setPath([ROOT]);
    setScreen("browse");
  }
  function restart() {
    setPath([ROOT]);
    setSelection(null);
    setScreen("landing");
  }
  function back() {
    if (screen === "result") {
      setScreen("browse");
      return;
    }
    if (path.length > 1) {
      setPath((p) => p.slice(0, -1));
    } else {
      setScreen("landing");
    }
  }

  const selectNode = useCallback(
    (node: CatalogNode) => {
      if (node.children && node.children.length > 0) {
        setPath((p) => [...p, node]);
        return;
      }
      if (node.productSlug && slugsExistentes.includes(node.productSlug)) {
        router.push(`/producto/${node.productSlug}`);
        return;
      }
      setSelection(node);
      setScreen("result");
      setHistory((h) => {
        const labels = [...breadcrumbLabels, node.label];
        const key = labels.join(" › ");
        const filtered = h.filter((e) => e.labels.join(" › ") !== key);
        const next = [{ labels, at: Date.now() }, ...filtered].slice(0, 4);
        saveHistory(next);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [breadcrumbLabels.join("|")]
  );

  function resumeFromHistory(entry: HistoryEntry) {
    setSelection({ id: "history", label: entry.labels[entry.labels.length - 1] });
    setPath([ROOT]);
    setScreen("result");
  }

  const selectionFullPath =
    screen === "result" && selection ? [...breadcrumbLabels, selection.label] : [];

  const siblings =
    screen === "result" ? current.children?.filter((c) => c.id !== selection?.id) ?? [] : [];

  return (
    <div className={`slv-root ${embedded ? "slv-embedded" : ""}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Work+Sans:wght@400;500;600&display=swap');

        .slv-root {
          --bg: #14100D;
          --panel: #1C1712;
          --panel-2: #241D16;
          --gold: #C89B5C;
          --gold-bright: #E3B979;
          --ink: #EDE3D3;
          --muted: #A6997F;
          --line: rgba(237,227,211,0.10);
          font-family: 'Work Sans', sans-serif;
          background: radial-gradient(120% 90% at 50% -10%, #241C15 0%, #14100D 55%, #0E0B08 100%);
          color: var(--ink);
          min-height: 100vh;
          width: 100%;
          display: flex;
          justify-content: center;
          box-sizing: border-box;
        }
        .slv-root *, .slv-root *::before, .slv-root *::after { box-sizing: border-box; }
        .slv-shell {
          width: 100%;
          max-width: 520px;
          min-height: 70vh;
          display: flex;
          flex-direction: column;
          position: relative;
          padding: 0 22px 32px;
        }
        .slv-display { font-family: 'Cormorant Garamond', serif; }
        .slv-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 0 6px; min-height: 52px;
        }
        .slv-iconbtn {
          background: transparent; border: none; color: var(--ink);
          width: 40px; height: 40px; border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 200ms ease;
        }
        .slv-iconbtn:hover { background: rgba(237,227,211,0.06); }
        .slv-iconbtn:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }

        .slv-breadcrumb { font-size: 0.78rem; color: var(--muted); text-align: center; flex: 1; padding: 0 8px; }

        .slv-flame-wrap { display:flex; justify-content:center; margin: 26px 0 6px; }
        @keyframes flicker {
          0%,100% { transform: scaleY(1) scaleX(1) translateY(0); opacity: 1; }
          25% { transform: scaleY(1.05) scaleX(0.97) translateY(-1px); opacity: 0.96; }
          50% { transform: scaleY(0.97) scaleX(1.02) translateY(0px); opacity: 1; }
          75% { transform: scaleY(1.03) scaleX(0.99) translateY(-0.5px); opacity: 0.98; }
        }
        .slv-flame { animation: flicker 3.2s ease-in-out infinite; filter: drop-shadow(0 0 18px rgba(200,155,92,0.45)); }
        @media (prefers-reduced-motion: reduce) { .slv-flame { animation: none; } }

        .slv-h1 { font-size: 2.3rem; line-height: 1.15; font-weight: 500; margin: 0 0 10px; text-align:center; }
        .slv-sub { color: var(--muted); font-size: 1rem; line-height: 1.5; text-align:center; margin: 0 auto 30px; max-width: 36ch; }

        .slv-cta {
          width: 100%; border: none; cursor: pointer;
          background: linear-gradient(180deg, var(--gold-bright), var(--gold));
          color: #1A1309; font-weight: 600; font-size: 1.05rem;
          padding: 17px 20px; border-radius: 14px;
          box-shadow: 0 10px 24px -8px rgba(200,155,92,0.55);
          transition: transform 180ms ease, box-shadow 180ms ease;
          text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        }
        .slv-cta:hover { transform: translateY(-1px); box-shadow: 0 14px 28px -8px rgba(200,155,92,0.65); }
        .slv-cta:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }

        .slv-ghost {
          width: 100%; background: transparent; cursor: pointer;
          border: 1px solid var(--line); color: var(--ink);
          font-size: 0.95rem; padding: 14px 18px; border-radius: 14px;
          transition: border-color 200ms ease, background 200ms ease;
          text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
          margin-bottom: 10px;
        }
        .slv-ghost:hover { border-color: rgba(237,227,211,0.28); background: rgba(237,227,211,0.03); }
        .slv-ghost:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }

        .slv-qlabel { font-size: 0.85rem; color: var(--muted); margin-bottom: 4px; }
        .slv-qtitle { font-size: 1.6rem; font-weight: 500; margin: 2px 0 22px; line-height:1.25; }

        .slv-option {
          width: 100%; display:flex; align-items:center; justify-content: space-between; gap: 14px;
          background: var(--panel); border: 1px solid var(--line);
          border-radius: 12px; padding: 11px 16px; margin-bottom: 8px;
          cursor: pointer; text-align: left; color: var(--ink); font-size: 0.95rem;
          transition: border-color 200ms ease, background 200ms ease, transform 150ms ease;
          min-height: 44px;
        }
        .slv-option:hover { border-color: var(--gold); background: var(--panel-2); transform: translateY(-1px); }
        .slv-option:active { transform: translateY(0); }
        .slv-option:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
        .slv-chevron { color: var(--muted); flex: none; }

        .slv-result-card {
          background: linear-gradient(180deg, var(--panel-2), var(--panel));
          border: 1px solid var(--line); border-radius: 18px; padding: 26px 22px;
          text-align: center; margin-bottom: 16px;
        }
        .slv-result-eyebrow { color: var(--muted); font-size: 0.82rem; margin-bottom: 8px; }
        .slv-result-name { font-size: 1.7rem; font-weight: 500; margin: 0 0 16px; }
        .slv-result-image {
          width: 100%; max-width: 220px; aspect-ratio: 1 / 1; object-fit: cover;
          border-radius: 14px; margin: 0 auto 18px; display: block;
          border: 1px solid var(--line);
        }

        .slv-sibling-row { display:flex; flex-wrap: wrap; gap: 8px; justify-content:center; margin-bottom: 20px; }
        .slv-sibling-chip {
          background: var(--panel); border: 1px solid var(--line); color: var(--ink);
          font-size: 0.82rem; padding: 8px 14px; border-radius: 999px; cursor: pointer;
          transition: border-color 200ms ease;
        }
        .slv-sibling-chip:hover { border-color: var(--gold); }

        .slv-link { background:none; border:none; color: var(--muted); font-size: 0.9rem; cursor:pointer; text-decoration: underline; text-underline-offset:3px; }
        .slv-link:hover { color: var(--ink); }

        .slv-history-item {
          width:100%; text-align:left; background: var(--panel); border:1px solid var(--line);
          border-radius: 12px; padding: 12px 14px; margin-bottom: 8px; cursor:pointer; color: var(--ink);
          font-size: 0.85rem; transition: border-color 200ms ease;
        }
        .slv-history-item:hover { border-color: var(--gold); }
        .slv-shell { font-family: 'Work Sans', sans-serif; }

        /* Modo embebido: sin fondo propio ni altura de pantalla completa,
           para flotar como tarjeta sobre la foto del hero del home. */
        .slv-embedded {
          background: transparent;
          min-height: 0;
          width: 100%;
        }
        .slv-embedded .slv-shell {
          max-width: 460px;
          margin: 0 auto;
          background: rgba(20, 16, 13, 0.62);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(237, 227, 211, 0.14);
          border-radius: 24px;
          padding: 30px 24px 26px;
          box-shadow: 0 24px 60px -20px rgba(0,0,0,0.65);
        }
        .slv-embedded .slv-h1 { font-size: 2rem; }
      `}</style>

      <div className="slv-shell">
        {screen !== "landing" && (
          <div className="slv-topbar">
            <button className="slv-iconbtn" onClick={back} aria-label="Volver">
              <ArrowLeft size={20} />
            </button>
            <div className="slv-breadcrumb">
              {screen === "browse"
                ? breadcrumbLabels.length > 0
                  ? breadcrumbLabels.join(" › ")
                  : "Líneas de productos"
                : selectionFullPath.slice(0, -1).join(" › ")}
            </div>
            <button className="slv-iconbtn" onClick={restart} aria-label="Empezar de nuevo">
              <X size={20} />
            </button>
          </div>
        )}

        {/* ---------------- LANDING ---------------- */}
        {screen === "landing" && (
          <Fade screenKey="landing">
            <div style={{ paddingTop: 28 }}>
              <div className="slv-flame-wrap">
                <FlameIcon />
              </div>
              <h1 className="slv-h1 slv-display">Explora nuestro catálogo</h1>
              <p className="slv-sub">
                Recorre nuestras líneas de productos —veladoras, cirios,
                desahumerios, artículos religiosos y más— hasta encontrar
                justo lo que buscas.
              </p>
              <button className="slv-cta" onClick={openCatalog}>
                Ver líneas de productos
              </button>

              {history.length > 0 && (
                <div style={{ marginTop: 34 }}>
                  <div className="slv-qlabel" style={{ marginBottom: 10 }}>
                    Tus consultas recientes
                  </div>
                  {history.map((h) => (
                    <button
                      key={h.labels.join("|")}
                      className="slv-history-item"
                      onClick={() => resumeFromHistory(h)}
                    >
                      {h.labels[h.labels.length - 1]}{" "}
                      <span style={{ color: "var(--muted)" }}>
                        · {h.labels.slice(0, -1).join(" › ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Fade>
        )}

        {/* ---------------- NAVEGACIÓN POR LÍNEA/CATEGORÍA ---------------- */}
        {screen === "browse" && (
          <Fade screenKey={breadcrumbLabels.join("|")}>
            <h2 className="slv-qtitle slv-display">
              {path.length === 1 ? "¿Qué línea buscas?" : current.label}
            </h2>
            {(current.children ?? []).map((node) => (
              <button key={node.id} className="slv-option" onClick={() => selectNode(node)}>
                {node.label}
                {node.children && node.children.length > 0 && (
                  <ChevronRight size={18} className="slv-chevron" />
                )}
              </button>
            ))}
          </Fade>
        )}

        {/* ---------------- RESULTADO ---------------- */}
        {screen === "result" && selection && (
          <Fade screenKey="result">
            <div className="slv-result-card">
              {selection.previewImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selection.previewImage}
                  alt={selection.label}
                  className="slv-result-image"
                />
              )}
              <div className="slv-result-eyebrow">
                {selectionFullPath.slice(0, -1).join(" › ") || "Catálogo"}
              </div>
              <h2 className="slv-result-name slv-display">{selection.label}</h2>
              <a className="slv-cta" href={whatsappHref(selectionFullPath)} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} />
                Consultar precio y disponibilidad
              </a>
            </div>

            {siblings.length > 0 && (
              <>
                <div className="slv-qlabel" style={{ textAlign: "center", marginBottom: 10 }}>
                  También en {current.label}
                </div>
                <div className="slv-sibling-row">
                  {siblings.slice(0, 6).map((s) => (
                    <button key={s.id} className="slv-sibling-chip" onClick={() => selectNode(s)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <Link href="/catalogo" className="slv-ghost">
              Ver catálogo completo
            </Link>
            <button className="slv-link" style={{ display: "block", margin: "4px auto 0" }} onClick={openCatalog}>
              Explorar otra línea
            </button>
          </Fade>
        )}
      </div>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg className="slv-flame" width="52" height="72" viewBox="0 0 52 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M26 4C26 4 10 22 10 40C10 53.2548 17.1634 62 26 62C34.8366 62 42 53.2548 42 40C42 34 39 27 35 22C35.5 27 33.5 30 31 31C31.5 24 28 16 26 4Z"
        fill="url(#slvFlameGrad)"
      />
      <path
        d="M26 40C26 40 20 47 20 53C20 58 22.5 62 26 62C29.5 62 32 58 32 53C32 49 30 45 28 42C28 44.5 27 46 26 46.5C26.3 44 25.5 42 26 40Z"
        fill="#F2D9A8"
        opacity="0.9"
      />
      <defs>
        <linearGradient id="slvFlameGrad" x1="26" y1="4" x2="26" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E3B979" />
          <stop offset="0.55" stopColor="#C89B5C" />
          <stop offset="1" stopColor="#8C5A2E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Puebla la base de datos con productos de muestra (mismos que se veían en
// el sitio original de Shopify). Se ejecuta con: npx prisma db seed
//
// Es seguro correrlo varias veces: usa upsert por slug, así que no duplica
// productos si ya existen — y ahora también actualiza sus datos (precio,
// imágenes, variantes) si cambiaron aquí.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const productos = [
  {
    slug: "cirio-pascual-libra",
    nombre: "Cirio Pascual de Libra",
    referencia: "B-00036",
    descripcion:
      "Cirio pascual decorado con cruz y símbolos alfa/omega, ideal para celebraciones litúrgicas y ceremonias especiales.",
    precioBase: 41606,
    imagen: "/productos/cirio-pascual-libra.jpg",
    categoriaSlug: "velas-iluminacion",
    destacado: true,
    variantes: [
      { nombre: "1 Libra", precio: 41606 },
      { nombre: "2 Libras", precio: 70006 },
    ],
  },
  {
    slug: "cirio-pascual-ii-libras",
    nombre: "Cirio Pascual II Libras",
    referencia: "B-00037",
    descripcion:
      "Cirio pascual grande con motivos religiosos pintados a mano: cruz, uvas, cáliz y símbolos pascuales.",
    precioBase: 70006,
    imagen: "/productos/cirio-pascual-ii.jpg",
    categoriaSlug: "velas-iluminacion",
    destacado: true,
    variantes: [],
  },
  {
    slug: "cubre-vela",
    nombre: "Cubre Vela",
    descripcion:
      "Farol decorativo en metal calado, protege la llama y aporta un ambiente cálido a cualquier espacio.",
    precioBase: 45000,
    imagen: "/productos/cubre-vela.jpg",
    categoriaSlug: "velas-iluminacion",
    destacado: true,
    variantes: [],
  },
  {
    slug: "veladora-no-1-san-rafael",
    nombre: "Veladora No. 1 – San Rafael",
    referencia: "BS-00001",
    descripcion:
      "Veladora No. 1 de parafina, línea San Rafael. 4 cm de alto x 4.3 cm de diámetro, ~54 g. Disponible en 10 colores. Presentación por unidad o por paquete de 12. Ideal para novenas, peticiones y ofrendas.",
    precioBase: 1532,
    imagen: "/productos/veladora-no-1.jpg",
    imagenSecundaria: "/productos/veladora-no-1-colores.jpg",
    categoriaSlug: "velas-iluminacion",
    destacado: true,
    variantes: [
      { nombre: "Blanco", precio: 1532 },
      { nombre: "Azul Marino", precio: 1532 },
      { nombre: "Celeste", precio: 1532 },
      { nombre: "Amarillo", precio: 1532 },
      { nombre: "Verde", precio: 1532 },
      { nombre: "Rojo", precio: 1532 },
      { nombre: "Naranja", precio: 1532 },
      { nombre: "Rosado", precio: 1532 },
      { nombre: "Morado", precio: 1532 },
      { nombre: "Negro", precio: 1532 },
    ],
  },
  {
    slug: "veladora-no-1-cinco-estrellas",
    nombre: "Veladora No. 1 – Cinco Estrellas",
    referencia: "BE-00001",
    descripcion:
      "Veladora No. 1 de parafina, línea Cinco Estrellas. 4 cm de alto x 4.3 cm de diámetro, ~54 g. Disponible en 10 colores. Presentación por unidad o por paquete de 12. Ideal para novenas, peticiones y ofrendas.",
    precioBase: 1645,
    imagen: "/productos/veladora-no-1.jpg",
    imagenSecundaria: "/productos/veladora-no-1-colores.jpg",
    categoriaSlug: "velas-iluminacion",
    destacado: true,
    variantes: [
      { nombre: "Blanco", precio: 1645 },
      { nombre: "Azul Marino", precio: 1645 },
      { nombre: "Celeste", precio: 1645 },
      { nombre: "Amarillo", precio: 1645 },
      { nombre: "Verde", precio: 1645 },
      { nombre: "Rojo", precio: 1645 },
      { nombre: "Naranja", precio: 1645 },
      { nombre: "Rosado", precio: 1645 },
      { nombre: "Morado", precio: 1645 },
      { nombre: "Negro", precio: 1645 },
    ],
  },
  {
    slug: "veladora-no-1-celeste",
    nombre: "Veladora No. 1 – Celeste",
    referencia: "BC-00001",
    descripcion:
      "Veladora No. 1 de parafina, línea Celeste. 3.9 cm de alto x 4.2 cm de diámetro, ~53 g. Disponible en 10 colores. Presentación por unidad o por paquete de 12. Ideal para novenas, peticiones y ofrendas.",
    precioBase: 1296,
    imagen: "/productos/veladora-no-1.jpg",
    imagenSecundaria: "/productos/veladora-no-1-colores.jpg",
    categoriaSlug: "velas-iluminacion",
    destacado: true,
    variantes: [
      { nombre: "Blanco", precio: 1296 },
      { nombre: "Azul Marino", precio: 1296 },
      { nombre: "Celeste", precio: 1296 },
      { nombre: "Amarillo", precio: 1296 },
      { nombre: "Verde", precio: 1296 },
      { nombre: "Rojo", precio: 1296 },
      { nombre: "Naranja", precio: 1296 },
      { nombre: "Rosado", precio: 1296 },
      { nombre: "Morado", precio: 1296 },
      { nombre: "Negro", precio: 1296 },
    ],
  },
  // -- Referencias 00002: presentación "especial". Oro y Plata ya tienen
  // foto real y son las únicas variantes vendibles por ahora. El resto de
  // diseños "Especial" (Santa Marta, San Pancracio, Desespero, etc.) viven
  // solo en el árbol del selector litúrgico y mandan a WhatsApp — no son
  // variantes de este producto porque todavía no tienen precio ni foto.
  {
    slug: "veladora-no-1-especial-san-rafael",
    nombre: "Veladora No. 1 Especial – San Rafael",
    referencia: "BS-00002",
    descripcion:
      "Veladora No. 1 Especial de parafina, línea San Rafael. 4 cm de alto x 4.3 cm de diámetro, ~54 g. Colores Oro y Plata. Presentación por unidad o por paquete de 12.",
    precioBase: 1645,
    imagen: "/productos/veladora-especial-oro.jpg",
    imagenSecundaria: "/productos/veladora-especial-plata.jpg",
    categoriaSlug: "velas-iluminacion",
    destacado: false,
    variantes: [
      { nombre: "Oro", precio: 1645 },
      { nombre: "Plata", precio: 1645 },
    ],
  },
  {
    slug: "veladora-no-1-especial-cinco-estrellas",
    nombre: "Veladora No. 1 Especial – Cinco Estrellas",
    referencia: "BE-00002",
    descripcion:
      "Veladora No. 1 Especial de parafina, línea Cinco Estrellas. 4 cm de alto x 4.3 cm de diámetro, ~54 g. Colores Oro y Plata. Presentación por unidad o por paquete de 12.",
    precioBase: 1667,
    imagen: "/productos/veladora-especial-oro.jpg",
    imagenSecundaria: "/productos/veladora-especial-plata.jpg",
    categoriaSlug: "velas-iluminacion",
    destacado: false,
    variantes: [
      { nombre: "Oro", precio: 1667 },
      { nombre: "Plata", precio: 1667 },
    ],
  },
  {
    slug: "veladora-no-1-especial-celeste",
    nombre: "Veladora No. 1 Especial – Celeste",
    referencia: "BC-00002",
    descripcion:
      "Veladora No. 1 Especial de parafina, línea Celeste. 3.9 cm de alto x 4.2 cm de diámetro, ~53 g. Colores Oro y Plata. Presentación por unidad o por paquete de 12.",
    precioBase: 1296,
    imagen: "/productos/veladora-especial-oro.jpg",
    imagenSecundaria: "/productos/veladora-especial-plata.jpg",
    categoriaSlug: "velas-iluminacion",
    destacado: false,
    variantes: [
      { nombre: "Oro", precio: 1296 },
      { nombre: "Plata", precio: 1296 },
    ],
  },
  {
    slug: "vela-acanalada-grande",
    nombre: "Vela Acanalada Grande",
    referencia: "B-00012",
    descripcion:
      "Set de velas acanaladas artesanales, perfectas para decoración de mesa o rituales de oración.",
    precioBase: 10295,
    imagen: "/productos/vela-acanalada.jpg",
    categoriaSlug: "velas-iluminacion",
    destacado: true,
    variantes: [
      { nombre: "Azul", precio: 10295 },
      { nombre: "Blanco", precio: 10295 },
      { nombre: "Rojo", precio: 10295 },
    ],
  },
  {
    slug: "vela-aromatizada-lavanda",
    nombre: "Vela Aromatizada Lavanda",
    descripcion:
      "Ambienta tus espacios con nuestras fragancias más exclusivas. Elaborada con cera de soya y aceites esenciales.",
    precioBase: 38000,
    imagen: "/productos/vela-aromatizada.jpg",
    categoriaSlug: "aromaterapia-espiritual",
    destacado: true,
    variantes: [],
  },
  {
    slug: "imagen-virgen-maria",
    nombre: "Imagen Virgen María",
    descripcion:
      "Figura religiosa de altar, elaborada en resina con acabado fino, ideal para el hogar o como regalo.",
    precioBase: 89000,
    imagen: "/productos/virgen-maria.jpg",
    categoriaSlug: "arte-religioso",
    destacado: false,
    variantes: [],
  },
  {
    slug: "kit-higiene-natural",
    nombre: "Kit Higiene y Bienestar Natural",
    descripcion:
      "Jabones artesanales y aceites naturales para el cuidado personal, elaborados con ingredientes naturales.",
    precioBase: 52000,
    imagen: "/productos/kit-higiene.jpg",
    categoriaSlug: "higiene-bienestar",
    destacado: false,
    variantes: [],
  },
];

async function main() {
  for (const p of productos) {
    const { variantes, ...datos } = p;
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        ...datos,
        variantes: { deleteMany: {}, create: variantes },
      },
      create: {
        ...datos,
        variantes: { create: variantes },
      },
    });
  }
  console.log(`Sembrados ${productos.length} productos de muestra.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

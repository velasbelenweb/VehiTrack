/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Las imágenes subidas desde el admin viajan como base64 dentro del
      // formulario (Server Action). Se sube el límite por defecto (1MB) para
      // permitir fotos de producto razonables.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;

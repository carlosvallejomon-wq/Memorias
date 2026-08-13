/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  // El Dotbook lee las portadas de plantilla directamente del disco, no por
  // internet. Vercel solo empaqueta con la función los archivos que detecta
  // que se usan, y una ruta construida en tiempo de ejecución no la detecta:
  // hay que declararla aquí o las portadas no existirían dentro de la función.
  outputFileTracingIncludes: {
    "/api/albums/[albumId]/dotbook": [
      "./public/dotbook-templates/**",
      "./public/dotbook-assets/**",
    ],
    "/api/guest/[code]/dotbook": [
      "./public/dotbook-templates/**",
      "./public/dotbook-assets/**",
    ],
  },
};

export default nextConfig;

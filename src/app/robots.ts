import type { MetadataRoute } from "next";

// Los álbumes son privados: solo debe entrar quien tiene el enlace, así que
// se le pide a los buscadores que no los indexen. La portada sí.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/a/", "/dashboard/", "/api/"] }],
  };
}

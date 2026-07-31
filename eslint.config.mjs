import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// Reglas de Next.js (accesibilidad básica, hooks de React, imágenes). Antes no
// había ninguna comprobación automática: cualquier despiste se descubría
// mirando la pantalla.
export default [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // El proyecto usa <img> a propósito: las fotos vienen de Vercel Blob y
      // el optimizador de Next las cobraría por transformación.
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Estas tres son reglas nuevas del compilador de React. Marcan patrones
      // que aquí son correctos y están verificados en el navegador: leer
      // localStorage al montar (no se puede hacer al renderizar, porque el
      // servidor no lo tiene), pedir datos al servidor en un efecto, y usar
      // Date.now() para pausar un carrusel. Se dejan como aviso para verlas,
      // pero no deben tumbar la comprobación automática.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

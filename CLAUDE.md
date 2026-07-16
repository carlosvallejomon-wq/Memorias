# Memorias Vivas — contexto del proyecto

## Qué es esto

Una app para guardar y compartir fotos/vídeos de eventos (bodas, cumpleaños,
viajes), modelada sobre **Dots Memories** ([dotsmemories.app](https://dotsmemories.app)):
el organizador crea un álbum, genera un QR/enlace, y los invitados suben
fotos desde el móvil **sin instalar nada y sin registrarse**. El contenido se
ordena solo por fecha, todos pueden comentar/reaccionar, vista tipo
calendario. Más adelante: "Dotbook" (libro físico/PDF de recuerdos).

## ⚠️ Pivote de arquitectura — leer antes de tocar código

La primera vuelta de este proyecto (ver historial de commits en `main`,
PRs #1–#10) se construyó siguiendo un prompt de otra IA que pedía una
arquitectura de nivel "startup con Serie A": NestJS + tRPC + WebSockets +
BullMQ + Redis + reconocimiento facial + app Flutter + mapa 3D +
cifrado E2E, desplegado en Render (backend) + Vercel (panel) + Neon
(Postgres) + Upstash (Redis) + Clerk (auth).

**Se abandonó esa arquitectura.** No porque el código estuviera mal — de
hecho compilaba y funcionaba — sino porque es demasiada complejidad para lo
que el usuario necesita de verdad, y generó una cadena de bugs de despliegue
(workspace de npm mal instalado en Vercel, middleware.ts en la ubicación
incorrecta, aprovisionamiento de usuario que no ocurría a tiempo) que costó
horas de ida y vuelta sin llegar a un producto usable.

**Dirección nueva, acordada con el usuario:** una sola app Next.js
(sin backend NestJS separado, sin Render, sin Redis/BullMQ, sin Clerk
obligatorio para invitados), desplegable en **Vercel + Neon** únicamente,
tal como el usuario ya despliega sus otros proyectos con Claude Code.

## Qué hacer con el código existente

`/backend` (NestJS), `/mobile` (Flutter) y el `/web-dashboard` actual (Next.js
apuntando al backend NestJS) son el intento anterior. Antes de escribir nada
nuevo, **decide con el usuario** si:
- se archivan/borran y se empieza limpio dentro del mismo repo, o
- se reutiliza selectivamente algo (el esquema de Drizzle, el flujo de
  presigned URLs, el cifrado E2E en `web-dashboard/src/lib/e2ee.ts` son
  razonablemente independientes de la arquitectura pesada y podrían
  adaptarse).

No asumas que hay que partir de estos directorios tal cual — el usuario
quiere simplicidad ante todo.

## Cuentas ya creadas (no crear más sin necesidad)

El usuario ya tiene, con datos reales ya usados en este proyecto:
- **Neon** (Postgres) — reutilizable para la app nueva.
- **Clerk** — reutilizable si se mantiene login para el organizador (los
  invitados nunca deben necesitar cuenta).
- **Vercel** — reutilizable, es el único sitio donde debería desplegarse.
- **Render** y **Upstash** — ya no deberían hacer falta con la arquitectura
  simplificada. No pedir que se creen cuentas nuevas salvo que sea
  estrictamente necesario, y explicar siempre el porqué antes de pedir un
  registro.

## Repo y flujo de trabajo

- Repo: `carlosvallejomon-wq/Memorias`.
- El push directo desde la sesión de Claude Code **funciona** (tras
  resolver un problema de permisos de la integración de GitHub que ya
  quedó atrás). Flujo normal: rama por feature → PR → merge a `main`.
- El usuario no es programador — no maneja bien la terminal de su PC.
  Prioriza soluciones que no requieran que él ejecute comandos en su
  máquina. Cuando algo sí lo requiera, guía paso a paso, un comando a la
  vez, esperando confirmación antes de seguir.
- Antes de dar por buena cualquier funcionalidad, verifícala de verdad
  (build real, arranque real, curl/Playwright) — no te fíes solo de que
  compile. Varios bugs de esta primera vuelta solo se detectaron al probar
  en producción real porque no se verificaron en tiempo de ejecución.

## Estado al momento de escribir esto

Se abortó el plan anterior justo cuando el panel desplegado (viejo) fallaba
al crear/cargar álbumes en producción, tras arreglar varios bugs reales
(orden de carga de `.env`, ubicación de `middleware.ts`, aprovisionamiento
JIT de usuarios). El usuario prefirió parar y simplificar en vez de seguir
depurando la arquitectura compleja. Esta sesión terminó aquí; la siguiente
debería empezar por acordar el alcance exacto del MVP simplificado antes de
escribir código.

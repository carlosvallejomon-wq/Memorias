"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import {
  ArrowLeft,
  Camera,
  CalendarDays,
  CalendarX,
  Heart,
  LayoutGrid,
  X,
  Hourglass,
  Images,
  KeyRound,
  MessageCircle,
  PenLine,
  Play,
  Loader2,
  Sparkles,
  Target,
  Upload,
  User,
  Users,
  Video,
} from "lucide-react";
import { computeJustifiedRows, useElementWidth } from "@/lib/justified-layout";
import {
  type ChallengeItem,
  type MediaItem,
  avatarColor,
  initial,
  mediaAlt,
  reactionTotal,
} from "@/lib/guest-types";
import { expiryWarning } from "@/lib/expiry";
import { MAX_FILE_BYTES, formatMb } from "@/lib/limits";
import { isVideo, looksLikeHeic, prepareForUpload } from "@/lib/prepare-upload";
import { ChallengeIcon } from "@/components/ChallengeIcon";
import { GuestIdentity } from "@/components/GuestIdentity";
import { Notice, type NoticeState } from "@/components/Notice";
import { GuestChallenges } from "@/components/GuestChallenges";
import { GuestLightbox } from "@/components/GuestLightbox";
import { GuestMessageWall } from "@/components/GuestMessageWall";

type View = "galeria" | "dias" | "retos" | "mensajes";
type Filter = "todos" | "mias" | "videos" | "queridas";

/** Cuántos recuerdos se pintan de una tanda. */
const PAGE_SIZE = 60;

function useLocalValue(key: string, generate?: () => string) {
  const [value, setValue] = useState("");
  useEffect(() => {
    let v = localStorage.getItem(key) ?? "";
    if (!v && generate) {
      v = generate();
      localStorage.setItem(key, v);
    }
    setValue(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const save = useCallback(
    (v: string) => {
      setValue(v);
      localStorage.setItem(key, v);
    },
    [key],
  );
  return [value, save] as const;
}

function itemDate(item: MediaItem): Date {
  return new Date(item.takenAt ?? item.createdAt);
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayLabel(key: string): string {
  return new Date(key + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function GuestAlbum({
  code,
  albumId,
  name,
  eventDate,
  expiresAt = null,
  fromPanel = false,
}: {
  code: string;
  albumId: string;
  name: string;
  eventDate: string | null;
  /** Fecha de cierre, si el organizador puso una. */
  expiresAt?: string | null;
  fromPanel?: boolean;
}) {
  const [guestId, setGuestId] = useLocalValue("mv_guest_id", () => crypto.randomUUID());
  const [guestName, setGuestName] = useLocalValue("mv_guest_name");
  const [askName, setAskName] = useState(false);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [challenges, setChallenges] = useState<ChallengeItem[] | null>(null);
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [view, setView] = useState<View>("galeria");
  const [filter, setFilter] = useState<Filter>("todos");
  const [person, setPerson] = useState<string | null>(null);
  const [challengeFilter, setChallengeFilter] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{
    done: number;
    total: number;
    step: string | null;
  } | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [showIdentity, setShowIdentity] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [pendingDate, setPendingDate] = useState(eventDate ?? "");
  const [pendingChallengeId, setPendingChallengeId] = useState<string | null>(null);
  const nextChallengeId = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [galleryRef, galleryWidth] = useElementWidth<HTMLDivElement>();

  const aviso = expiryWarning(expiresAt);

  // La vuelta atrás al panel se recuerda en este navegador. Antes dependía de
  // llegar con ?panel=1 en la dirección: en cuanto se recargaba o se
  // compartía el enlace, el organizador se quedaba sin forma de volver y solo
  // le quedaba el enlace a la portada.
  const [esOrganizador, setEsOrganizador] = useState(fromPanel);
  useEffect(() => {
    const clave = `mv_panel_${code}`;
    if (fromPanel) {
      localStorage.setItem(clave, "1");
      setEsOrganizador(true);
    } else if (localStorage.getItem(clave) === "1") {
      setEsOrganizador(true);
    }
  }, [code, fromPanel]);

  const handleRatio = useCallback((id: string, ratio: number) => {
    setRatios((prev) => (prev[id] ? prev : { ...prev, [id]: ratio }));
  }, []);

  const refresh = useCallback(async () => {
    if (!guestId) return;
    const res = await fetch(
      `/api/guest/${code}/media?guestId=${encodeURIComponent(guestId)}`,
    );
    if (res.ok) {
      const data = (await res.json()) as { items: MediaItem[] };
      setItems(data.items);
    }
  }, [code, guestId]);

  const refreshChallenges = useCallback(async () => {
    const res = await fetch(`/api/guest/${code}/challenges`);
    if (res.ok) {
      const data = (await res.json()) as { items: ChallengeItem[] };
      setChallenges(data.items);
    } else {
      setChallenges([]);
    }
  }, [code]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshChallenges();
  }, [refreshChallenges]);

  // Cerrar el saludo del nombre: se marca como ya preguntado para no volver a
  // sacarlo, se haya escrito nombre o no.
  const cerrarNombre = useCallback(() => {
    localStorage.setItem("mv_guest_name_asked", "1");
    setAskName(false);
  }, []);

  // La tecla Esc cierra el saludo, como en cualquier ventana del sistema.
  useEffect(() => {
    if (!askName) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrarNombre();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [askName, cerrarNombre]);

  // Durante la fiesta la gente sube fotos a la vez: sin esto había que
  // recargar a mano para ver lo que iban subiendo los demás. Solo consulta
  // cuando la pestaña está a la vista, para no gastar datos ni batería en un
  // móvil guardado en el bolsillo.
  useEffect(() => {
    if (!guestId) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      refresh();
      refreshChallenges();
    };
    const id = setInterval(tick, 20_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [guestId, refresh, refreshChallenges]);

  useEffect(() => {
    if (guestId && !localStorage.getItem("mv_guest_name_asked")) {
      setAskName(true);
    }
  }, [guestId]);

  const all = useMemo(() => items ?? [], [items]);
  const challengeById = useMemo(
    () => new Map((challenges ?? []).map((c) => [c.id, c])),
    [challenges],
  );

  // Personas que han subido algo, para poder filtrar «lo que trajo la tía
  // Marta» sin buscar a mano entre cientos de fotos.
  const people = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of all) {
      const n = it.uploaderName?.trim();
      if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([n, count]) => ({ name: n, count }));
  }, [all]);

  const mineCount = all.filter((i) => !!guestId && i.uploaderId === guestId).length;
  const videoCount = all.filter((i) => i.type === "video").length;

  // Lista que se está mostrando: sobre ella actúan también las flechas del
  // visor, para que «siguiente» signifique lo mismo que se ve en pantalla.
  const visible = useMemo(() => {
    let list = all;
    if (challengeFilter) list = list.filter((i) => i.challengeId === challengeFilter);
    if (person) list = list.filter((i) => i.uploaderName?.trim() === person);
    if (filter === "mias") list = list.filter((i) => !!guestId && i.uploaderId === guestId);
    else if (filter === "videos") list = list.filter((i) => i.type === "video");
    else if (filter === "queridas")
      list = [...list].sort(
        (a, b) =>
          reactionTotal(b) + b.commentCount - (reactionTotal(a) + a.commentCount),
      );
    return list;
  }, [all, challengeFilter, person, filter, guestId]);

  // Al cambiar de filtro o de pestaña se vuelve a empezar por la primera
  // tanda: si no, se quedaba pidiendo fotos de una lista que ya no existe.
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [filter, person, challengeFilter, view]);

  // Carga la siguiente tanda cuando el final de la galería asoma por
  // pantalla, sin que el invitado tenga que pulsar nada.
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown((n) => n + PAGE_SIZE);
        }
      },
      { rootMargin: "600px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [view, visible.length, shown]);

  const selectedIndex = selectedId ? visible.findIndex((i) => i.id === selectedId) : -1;
  const selected = selectedIndex >= 0 ? visible[selectedIndex] : null;

  // Si la foto abierta desaparece del filtro (o se borra), se cierra el visor
  // en vez de quedarse en un estado imposible.
  useEffect(() => {
    if (selectedId && selectedIndex < 0) setSelectedId(null);
  }, [selectedId, selectedIndex]);

  function askForFiles(challengeId: string | null) {
    nextChallengeId.current = challengeId;
    fileInput.current?.click();
  }

  function selectFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPendingChallengeId(nextChallengeId.current);
    setPendingFiles(Array.from(files));
  }

  function cancelUpload() {
    setPendingFiles(null);
    setPendingChallengeId(null);
    nextChallengeId.current = null;
    if (fileInput.current) fileInput.current.value = "";
  }

  async function confirmUpload() {
    const list = pendingFiles;
    if (!list || list.length === 0) return;

    const tooBig = list.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length > 0) {
      setNotice({
        tone: "error",
        text: `${tooBig.length === 1 ? "Este archivo pesa" : "Algunos archivos pesan"} más de ${formatMb(MAX_FILE_BYTES)} y no se puede subir: ${tooBig
          .map((f) => f.name)
          .join(", ")}`,
      });
    }
    const queue = list.filter((f) => f.size <= MAX_FILE_BYTES);
    if (queue.length === 0) {
      cancelUpload();
      return;
    }

    // Si el invitado elige una fecha, se aplica a todo el lote (lo normal es
    // subir varias fotos del mismo momento a la vez). Si la deja en blanco,
    // se usa la fecha del propio archivo como respaldo.
    const overrideTakenAt = pendingDate
      ? new Date(`${pendingDate}T12:00:00`).getTime()
      : null;
    const challengeId = pendingChallengeId;
    setPendingFiles(null);
    setUploading({ done: 0, total: queue.length, step: null });
    const fallos: string[] = [];

    for (const original of queue) {
      const takenAt = overrideTakenAt ?? original.lastModified;
      try {
        // Los HEIC del iPhone se pasan a JPG y los vídeos reciben un
        // fotograma de portada, todo aquí en el móvil antes de subir nada.
        if (looksLikeHeic(original)) {
          setUploading((u) => (u ? { ...u, step: "Preparando la foto…" } : u));
        } else if (isVideo(original)) {
          setUploading((u) => (u ? { ...u, step: "Preparando el vídeo…" } : u));
        }
        const { file, poster } = await prepareForUpload(original);
        setUploading((u) => (u ? { ...u, step: null } : u));

        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
          clientPayload: JSON.stringify({
            code,
            kind: "media",
            uploaderName: guestName || null,
            uploaderId: guestId || null,
            takenAt,
            challengeId,
          }),
        });

        let posterUrl: string | null = null;
        if (poster) {
          try {
            const posterBlob = await upload(poster.name, poster, {
              access: "public",
              handleUploadUrl: "/api/blob-upload",
              clientPayload: JSON.stringify({ code, kind: "poster" }),
            });
            posterUrl = posterBlob.url;
          } catch (err) {
            // Sin miniatura el vídeo se sigue viendo; no vale la pena
            // fastidiar la subida por esto.
            console.error("No se pudo subir la miniatura del vídeo:", err);
          }
        }

        await fetch(`/api/guest/${code}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: blob.url,
            pathname: blob.pathname,
            contentType: blob.contentType || file.type,
            posterUrl,
            uploaderName: guestName || null,
            uploaderId: guestId || null,
            takenAt,
            challengeId,
          }),
        });
      } catch (err) {
        console.error("Error subiendo", original.name, err);
        fallos.push(
          `«${original.name}»: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      setUploading((u) => (u ? { ...u, done: u.done + 1, step: null } : u));
    }

    setUploading(null);
    setPendingChallengeId(null);
    nextChallengeId.current = null;
    if (fileInput.current) fileInput.current.value = "";
    if (fallos.length > 0) {
      setNotice({ tone: "error", text: `No se pudo subir ${fallos.join(" · ")}` });
    } else if (queue.length > 0) {
      setNotice({
        tone: "ok",
        text:
          queue.length === 1
            ? "¡Listo! Tu recuerdo ya está en el álbum."
            : `¡Listo! Se han subido ${queue.length} recuerdos.`,
      });
    }
    await Promise.all([refresh(), refreshChallenges()]);
  }

  async function toggleReaction(item: MediaItem, emoji: string) {
    // Actualización optimista para que se sienta instantáneo.
    const had = item.myReactions.includes(emoji);
    const patch = (it: MediaItem): MediaItem =>
      it.id !== item.id
        ? it
        : {
            ...it,
            myReactions: had
              ? it.myReactions.filter((e) => e !== emoji)
              : [...it.myReactions, emoji],
            reactions: {
              ...it.reactions,
              [emoji]: Math.max(0, (it.reactions[emoji] ?? 0) + (had ? -1 : 1)),
            },
          };
    setItems((prev) => (prev ? prev.map(patch) : prev));
    await fetch(`/api/media/${item.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, emoji }),
    });
  }

  async function deleteOwn(item: MediaItem) {
    if (!confirm("¿Borrar esta foto que subiste?")) return;
    setItems((prev) => (prev ? prev.filter((i) => i.id !== item.id) : prev));
    setSelectedId(null);
    await fetch(`/api/media/${item.id}?guestId=${encodeURIComponent(guestId)}`, {
      method: "DELETE",
    });
    refreshChallenges();
  }

  // Con un álbum de cientos de fotos, pintarlas todas de golpe dejaba el
  // móvil clavado un buen rato. Se enseñan por tandas y van entrando solas al
  // llegar al final de la página.
  const shownItems = useMemo(() => visible.slice(0, shown), [visible, shown]);
  const hayMas = visible.length > shownItems.length;

  const grouped = shownItems.reduce<Map<string, MediaItem[]>>((map, it) => {
    const key = dayKey(itemDate(it));
    map.set(key, [...(map.get(key) ?? []), it]);
    return map;
  }, new Map());
  const dayKeys = [...grouped.keys()].sort().reverse();

  // Filas "justificadas": cada foto conserva su relación de aspecto real (sin
  // recortes) y cada fila se estira para llenar el ancho, así la galería se
  // ve ordenada aunque las fotos y vídeos no tengan todos el mismo tamaño.
  const rowHeight = galleryWidth < 480 ? 110 : 160;
  const gap = galleryWidth < 480 ? 6 : 8;
  const galleryRows = computeJustifiedRows(
    shownItems,
    ratios,
    galleryWidth,
    rowHeight,
    gap,
  );

  const dayCount = new Set(all.map((i) => dayKey(itemDate(i)))).size;
  const peopleCount = new Set(all.map((i) => i.uploaderId || i.uploaderName || "?")).size;
  const isGallery = view === "galeria" || view === "dias";

  const tabs: { id: View; icon: typeof LayoutGrid; label: string; badge?: number | null }[] = [
    { id: "galeria", icon: LayoutGrid, label: "Galería" },
    { id: "dias", icon: CalendarDays, label: "Días" },
    {
      id: "retos",
      icon: Target,
      label: "Retos",
      badge: challenges && challenges.length > 0 ? challenges.length : null,
    },
    { id: "mensajes", icon: PenLine, label: "Mensajes", badge: messageCount || null },
  ];

  const activeChallenge = challengeFilter ? challengeById.get(challengeFilter) : null;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-28">
      {/* Al organizador se le deja una vuelta atrás bien visible; el invitado
          normal solo ve la marca. */}
      {esOrganizador ? (
        <div className="pt-4">
          <Link
            href={albumId ? `/dashboard/${albumId}` : "/dashboard"}
            className="btn btn-soft px-4 py-2 text-sm"
          >
            <ArrowLeft size={16} /> Volver al panel del álbum
          </Link>
        </div>
      ) : null}

      <header className={esOrganizador ? "pt-4 text-center" : "pt-6 text-center"}>
        {!esOrganizador && (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-tinta/40 transition hover:text-tinta/70"
          >
            <Camera size={14} /> Memorias Vivas
          </Link>
        )}
        <h1
          className="text-balance mt-2 text-3xl font-semibold sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {name}
        </h1>
        {eventDate && (
          <p className="mt-1 text-tinta/60">
            {new Date(eventDate + "T00:00:00").toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
        {all.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-tinta/50">
            <span className="flex items-center gap-1.5">
              <Images size={14} /> {all.length} {all.length === 1 ? "recuerdo" : "recuerdos"}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={14} /> {peopleCount} {peopleCount === 1 ? "persona" : "personas"}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} /> {dayCount} {dayCount === 1 ? "día" : "días"}
            </span>
          </p>
        )}
        <button
          onClick={() => setShowIdentity(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-tinta/40 underline-offset-4 transition hover:text-tinta/70 hover:underline"
        >
          <KeyRound size={13} />
          {guestName ? `Estás como ${guestName}` : "Poner mi nombre"}
        </button>

        {/* Si el organizador puso fecha de cierre, se avisa a los invitados
            con tiempo para que se guarden lo que quieran. */}
        {aviso && (
          <p
            className={`mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs ${
              aviso.urgente
                ? "bg-red-50 text-red-800"
                : "bg-arena/70 text-tinta/60"
            }`}
          >
            <CalendarX size={14} className="shrink-0" />
            <span>
              {aviso.texto} Descarga las fotos que quieras guardar.
            </span>
          </p>
        )}
      </header>

      {/* Barra de pestañas pegajosa: en el móvil se navega con el pulgar sin
          tener que volver arriba del todo. */}
      <nav className="sticky top-0 z-20 -mx-2 mt-5 px-2 pt-2">
        <div className="barra-pastilla scroll-x flex items-center gap-2 px-3 py-2.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`chip ${view === t.id ? "chip-active" : ""}`}
            >
              <t.icon size={15} /> {t.label}
              {t.badge ? (
                <span
                  className={`rounded-full px-1.5 text-xs ${
                    view === t.id ? "bg-white/20" : "bg-tinta/10"
                  }`}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      {/* Filtros de la galería */}
      {isGallery && all.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="scroll-x flex items-center gap-2">
            <button
              onClick={() => setFilter("todos")}
              className={`chip ${filter === "todos" ? "chip-active" : ""}`}
            >
              <Sparkles size={14} /> Todo
            </button>
            {mineCount > 0 && (
              <button
                onClick={() => setFilter("mias")}
                className={`chip ${filter === "mias" ? "chip-active" : ""}`}
              >
                <User size={14} /> Mías ({mineCount})
              </button>
            )}
            {videoCount > 0 && (
              <button
                onClick={() => setFilter("videos")}
                className={`chip ${filter === "videos" ? "chip-active" : ""}`}
              >
                <Video size={14} /> Vídeos ({videoCount})
              </button>
            )}
            <button
              onClick={() => setFilter("queridas")}
              className={`chip ${filter === "queridas" ? "chip-active" : ""}`}
            >
              <Heart size={14} /> Más queridas
            </button>
          </div>

          {people.length > 1 && (
            <div className="scroll-x flex items-center gap-2">
              {people.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setPerson(person === p.name ? null : p.name)}
                  className={`chip ${person === p.name ? "chip-active" : ""}`}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: avatarColor(p.name) }}
                  >
                    {initial(p.name)}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {activeChallenge && (
            <button
              onClick={() => setChallengeFilter(null)}
              className="chip chip-active"
            >
              <ChallengeIcon icon={activeChallenge.emoji} size={14} />
              {activeChallenge.title}
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => selectFiles(e.target.files)}
      />

      {view === "retos" ? (
        <GuestChallenges
          challenges={challenges}
          onUpload={(c) => askForFiles(c.id)}
          onSee={(c) => {
            setChallengeFilter(c.id);
            setFilter("todos");
            setPerson(null);
            setView("galeria");
          }}
        />
      ) : view === "mensajes" ? (
        <GuestMessageWall
          code={code}
          guestId={guestId}
          guestName={guestName}
          onCountChange={setMessageCount}
        />
      ) : (
        <div ref={galleryRef}>
          {items === null ? (
            // Esqueleto de la galería: se percibe más rápido que un «Cargando…».
            <div className="mt-6 space-y-2">
              <div className="flex gap-2">
                <div className="skeleton h-32 flex-1 rounded-xl" />
                <div className="skeleton h-32 w-1/3 rounded-xl" />
              </div>
              <div className="flex gap-2">
                <div className="skeleton h-32 w-1/4 rounded-xl" />
                <div className="skeleton h-32 flex-1 rounded-xl" />
              </div>
            </div>
          ) : all.length === 0 ? (
            <div className="glass animate-fade-in mt-8 flex flex-col items-center gap-3 rounded-2xl p-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teja/25 to-teja/5 text-teja">
                <Camera size={28} />
              </span>
              <h2
                className="text-xl font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Este álbum espera su primer recuerdo
              </h2>
              <p className="max-w-sm text-tinta/60">
                Sube una foto o un vídeo desde tu móvil. No hace falta instalar
                nada ni crear ninguna cuenta.
              </p>
              <button
                onClick={() => askForFiles(null)}
                className="btn btn-primary shimmer mt-1"
              >
                <Camera size={17} /> Subir la primera foto
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-10 flex flex-col items-center gap-3 text-center text-tinta/60">
              <Images size={32} className="text-teja/50" />
              <p>No hay recuerdos que encajen con este filtro.</p>
              <button
                onClick={() => {
                  setFilter("todos");
                  setPerson(null);
                  setChallengeFilter(null);
                }}
                className="btn btn-soft"
              >
                Ver todo el álbum
              </button>
            </div>
          ) : view === "galeria" ? (
            <div className="mt-4 flex flex-col" style={{ gap }}>
              {galleryRows.map((row, i) => (
                <div key={i} className="flex" style={{ gap }}>
                  {row.map(({ item, width, height }) => (
                    <Thumb
                      key={item.id}
                      item={item}
                      width={width}
                      height={height}
                      mine={!!guestId && item.uploaderId === guestId}
                      challenge={item.challengeId ? challengeById.get(item.challengeId) : undefined}
                      onClick={() => setSelectedId(item.id)}
                      onRatio={(ratio) => handleRatio(item.id, ratio)}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-8">
              {dayKeys.map((key) => {
                const dayItems = grouped.get(key)!;
                const dayRows = computeJustifiedRows(
                  dayItems,
                  ratios,
                  galleryWidth,
                  rowHeight,
                  gap,
                );
                return (
                  <section key={key}>
                    <h2 className="flex items-center gap-2 text-sm font-semibold capitalize text-tinta/70">
                      <span className="h-px flex-1 bg-tinta/10" />
                      {dayLabel(key)}
                      <span className="font-normal text-tinta/40">· {dayItems.length}</span>
                      <span className="h-px flex-1 bg-tinta/10" />
                    </h2>
                    <div className="mt-3 flex flex-col" style={{ gap }}>
                      {dayRows.map((row, i) => (
                        <div key={i} className="flex" style={{ gap }}>
                          {row.map(({ item, width, height }) => (
                            <Thumb
                              key={item.id}
                              item={item}
                              width={width}
                              height={height}
                              mine={!!guestId && item.uploaderId === guestId}
                              challenge={
                                item.challengeId ? challengeById.get(item.challengeId) : undefined
                              }
                              onClick={() => setSelectedId(item.id)}
                              onRatio={(ratio) => handleRatio(item.id, ratio)}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* Marca el final de lo pintado: al asomar por pantalla entra la
              siguiente tanda de fotos. */}
          {hayMas && (
            <div
              ref={sentinel}
              className="mt-6 flex items-center justify-center gap-2 py-4 text-sm text-tinta/50"
            >
              <Loader2 size={16} className="animate-spin" />
              Cargando más recuerdos…
            </div>
          )}
        </div>
      )}

      {/* Botón flotante de subida */}
      {view !== "mensajes" && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-crema via-crema/90 to-transparent px-4 pb-5 pt-8">
          <button
            disabled={!!uploading}
            onClick={() => askForFiles(null)}
            className="btn btn-primary shimmer relative overflow-hidden px-8 py-3.5 text-lg"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {uploading.step ??
                  `Subiendo ${Math.min(uploading.done + 1, uploading.total)} de ${uploading.total}…`}
                <span
                  className="absolute bottom-0 left-0 h-1 bg-white/70 transition-[width] duration-300"
                  style={{ width: `${(uploading.done / uploading.total) * 100}%` }}
                />
              </>
            ) : (
              <>
                <Camera size={18} /> Subir fotos o vídeos
              </>
            )}
          </button>
        </div>
      )}

      {/* Confirmación antes de subir: permite corregir la fecha y elegir a qué
          reto pertenece la foto, para que el Dotbook y la vista por días
          queden bien organizados aunque el archivo no traiga la fecha real
          (frecuente en fotos reenviadas por WhatsApp). */}
      {pendingFiles && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="glass animate-fade-in w-full max-w-sm rounded-2xl p-6">
            <h2
              className="flex items-center gap-2 text-lg font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Upload size={18} className="text-teja" />
              {pendingFiles.length}{" "}
              {pendingFiles.length === 1 ? "archivo" : "archivos"}
            </h2>

            {challenges && challenges.length > 0 && (
              <>
                <label
                  htmlFor="mv-reto"
                  className="mt-4 block text-sm font-semibold text-tinta/70"
                >
                  ¿Es para algún reto?
                </label>
                <select
                  id="mv-reto"
                  value={pendingChallengeId ?? ""}
                  onChange={(e) => setPendingChallengeId(e.target.value || null)}
                  className="field mt-2"
                >
                  <option value="">Ninguno en concreto</option>
                  {challenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label
              htmlFor="mv-fecha"
              className="mt-4 block text-sm font-semibold text-tinta/70"
            >
              ¿De qué día son estas fotos?
            </label>
            <p className="mt-0.5 text-xs text-tinta/50">
              Opcional, pero ayuda a que se organicen bien en la galería y en el
              Dotbook.
            </p>
            <input
              id="mv-fecha"
              type="date"
              value={pendingDate}
              onChange={(e) => setPendingDate(e.target.value)}
              className="field mt-2"
            />
            <div className="mt-4 flex gap-2">
              <button onClick={cancelUpload} className="btn btn-soft flex-1">
                Cancelar
              </button>
              <button onClick={confirmUpload} className="btn btn-primary shimmer flex-1">
                Subir
              </button>
            </div>

            {/* Se subirán fotos de otras personas: conviene decirlo justo aquí,
                en el momento en que se decide, y no escondido en un enlace. */}
            <p className="mt-3 text-center text-[11px] leading-snug text-tinta/45">
              Al subir confirmas que puedes compartir estas imágenes y que
              cualquiera con el enlace del álbum podrá verlas.{" "}
              <a
                href="/legal/privacidad"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-tinta"
              >
                Privacidad
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Diálogo para pedir el nombre (opcional, una sola vez). Se puede
          cerrar de tres formas —la X, tocar fuera o la tecla Esc—: es una
          pregunta opcional y quedarse encerrado en ella no tiene sentido. */}
      {askName && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
          onClick={cerrarNombre}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mv-saludo"
            className="glass animate-fade-in relative w-full max-w-sm rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={cerrarNombre}
              aria-label="Cerrar"
              className="btn btn-ghost absolute right-3 top-3 p-1.5"
            >
              <X size={18} />
            </button>
            <h2
              id="mv-saludo"
              className="pr-8 text-lg font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ¡Hola! 👋
            </h2>
            <p className="mt-1 text-sm text-tinta/60">
              ¿Cómo te llamas? Así los demás sabrán quién compartió cada foto.
              Puedes dejarlo en blanco si lo prefieres.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                cerrarNombre();
              }}
            >
              <input
                autoFocus
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Tu nombre"
                maxLength={100}
                className="field mt-4"
              />
              <button type="submit" className="btn btn-primary shimmer mt-3 w-full">
                Continuar
              </button>
              <button
                type="button"
                onClick={cerrarNombre}
                className="btn btn-ghost mt-1 w-full text-sm"
              >
                Ahora no
              </button>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <GuestLightbox
          item={selected}
          index={selectedIndex}
          total={visible.length}
          guestId={guestId}
          guestName={guestName}
          challengeLabel={
            selected.challengeId
              ? (challengeById.get(selected.challengeId)?.title ?? null)
              : null
          }
          onClose={() => setSelectedId(null)}
          onPrev={() =>
            setSelectedId(
              visible[(selectedIndex - 1 + visible.length) % visible.length].id,
            )
          }
          onNext={() => setSelectedId(visible[(selectedIndex + 1) % visible.length].id)}
          onReact={(emoji) => toggleReaction(selected, emoji)}
          onDelete={() => deleteOwn(selected)}
          onCommentAdded={refresh}
        />
      )}

      {showIdentity && (
        <GuestIdentity
          guestId={guestId}
          guestName={guestName}
          onChangeName={setGuestName}
          onRestore={(id) => {
            setGuestId(id);
            setNotice({
              tone: "ok",
              text: "Listo. Este móvil ya te reconoce como el mismo invitado.",
            });
          }}
          onClose={() => setShowIdentity(false)}
        />
      )}

      <Notice notice={notice} onClose={() => setNotice(null)} />
    </main>
  );
}

function Thumb({
  item,
  mine,
  challenge,
  width,
  height,
  onClick,
  onRatio,
}: {
  item: MediaItem;
  mine: boolean;
  challenge?: ChallengeItem;
  width: number;
  height: number;
  onClick: () => void;
  onRatio: (ratio: number) => void;
}) {
  const total = reactionTotal(item);
  const pending = !item.approved;
  return (
    <button
      onClick={onClick}
      style={{ width, height }}
      className={`card-interactive relative block shrink-0 overflow-hidden rounded-xl bg-arena shadow-soft ${
        pending ? "opacity-60" : ""
      }`}
    >
      {item.type === "video" ? (
        <>
          {item.posterUrl ? (
            // Con miniatura no hace falta tocar el vídeo: se ve al instante y
            // no se gastan datos del invitado.
             
            <img
              src={item.posterUrl}
              alt={mediaAlt(item)}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight)
                  onRatio(img.naturalWidth / img.naturalHeight);
              }}
            />
          ) : (
            // Vídeos subidos antes de que existieran las miniaturas.
            <video
              src={item.url}
              className="h-full w-full object-cover"
              preload="metadata"
              muted
              playsInline
              aria-label={mediaAlt(item)}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) onRatio(v.videoWidth / v.videoHeight);
              }}
            />
          )}
          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white">
            <Play size={11} fill="white" />
          </span>
        </>
      ) : (
         
        <img
          src={item.url}
          alt={mediaAlt(item)}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight)
              onRatio(img.naturalWidth / img.naturalHeight);
          }}
        />
      )}
      {pending ? (
        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-tinta/80 px-2 py-0.5 text-[10px] font-semibold text-white">
          <Hourglass size={10} /> Pendiente
        </span>
      ) : mine ? (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-teja/90 px-2 py-0.5 text-[10px] font-semibold text-white">
          Tuya
        </span>
      ) : null}
      {challenge && (
        <span
          title={challenge.title}
          className="absolute right-1.5 bottom-1.5 flex items-center rounded-full bg-black/55 p-1 text-white"
        >
          <ChallengeIcon icon={challenge.emoji} size={12} />
        </span>
      )}
      {(total > 0 || item.commentCount > 0) && (
        <span className="absolute bottom-1 left-1.5 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
          {total > 0 && <span>❤️ {total}</span>}
          {item.commentCount > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageCircle size={11} /> {item.commentCount}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

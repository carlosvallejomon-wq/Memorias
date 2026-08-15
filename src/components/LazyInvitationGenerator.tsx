"use client";

import dynamic from "next/dynamic";
import { PartyPopper } from "lucide-react";
import { useState } from "react";

const InvitationEditor = dynamic(
  () =>
    import("@/components/InvitationGenerator").then(
      (module) => module.InvitationGenerator,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="animate-fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-8"
        role="status"
        aria-live="polite"
      >
        <div className="glass flex items-center gap-3 rounded-2xl px-6 py-5 text-sm font-semibold text-tinta shadow-lift">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-teja/30 border-t-teja" />
          Preparando el editor de invitaciones…
        </div>
      </div>
    ),
  },
);

export function LazyInvitationGenerator({
  albumName,
  eventDateLabel,
  shareUrl,
}: {
  albumName: string;
  eventDateLabel: string | null;
  shareUrl: string;
}) {
  const [active, setActive] = useState(false);

  if (active) {
    return (
      <InvitationEditor
        albumName={albumName}
        eventDateLabel={eventDateLabel}
        shareUrl={shareUrl}
        initiallyOpen
        hideTrigger
        onClose={() => setActive(false)}
      />
    );
  }

  return (
    <button
      onClick={() => setActive(true)}
      className="btn btn-soft shimmer px-4 py-2 text-sm"
    >
      <PartyPopper size={16} /> Invitación
    </button>
  );
}

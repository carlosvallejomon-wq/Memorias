import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Camera, LayoutGrid, Plus } from "lucide-react";

// Barra superior común del panel: da la sensación de estar dentro de una app
// y no en una página suelta, y deja siempre a mano crear un álbum.
export function DashboardTopBar() {
  return (
    <header className="sticky top-0 z-30 px-3 pt-2 sm:pt-3">
      <div className="barra-pastilla mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tinta text-crema">
            <Camera size={17} />
          </span>
          <span
            className="hidden text-lg sm:block"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Memorias Vivas
          </span>
        </Link>

        <Link
          href="/dashboard"
          className="ml-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-tinta/70 transition hover:bg-arena hover:text-tinta"
        >
          <LayoutGrid size={15} /> Mis álbumes
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard/nuevo" className="btn btn-primary px-4 py-2 text-sm">
            <Plus size={16} /> <span className="hidden sm:inline">Nuevo álbum</span>
          </Link>
          <UserButton />
        </div>
      </div>
    </header>
  );
}

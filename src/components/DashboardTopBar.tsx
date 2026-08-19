import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { LayoutGrid, Plus } from "lucide-react";

// Barra superior común del panel: da la sensación de estar dentro de una app
// y no en una página suelta, y deja siempre a mano crear un álbum.
export function DashboardTopBar() {
  return (
    <header className="sticky top-0 z-30 px-3 pt-2 sm:pt-3">
      <div className="barra-pastilla mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <img src="/brand/memorias-vivas-logo.png" alt="" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
          <span
            className="hidden text-lg sm:block"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Memorias Vivas
          </span>
        </Link>

        <Link
          href="/dashboard"
          className="ml-1 flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-semibold text-tinta/70 transition hover:bg-arena hover:text-tinta sm:ml-2 sm:px-3 sm:py-1.5"
        >
          <LayoutGrid size={15} /> <span className="hidden sm:inline">Mis álbumes</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard/nuevo" className="btn btn-primary px-3 py-2 text-sm sm:px-4">
            <Plus size={16} /> <span className="hidden sm:inline">Nuevo álbum</span>
          </Link>
          <UserButton />
        </div>
      </div>
    </header>
  );
}

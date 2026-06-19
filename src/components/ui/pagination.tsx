import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

export function Pagination({ currentPage, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const pages = buildPageList(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-center gap-1 py-4"
    >
      {hasPrev ? (
        <Link
          href={buildHref(currentPage - 1)}
          className="flex h-9 items-center gap-1 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Précédent</span>
        </Link>
      ) : (
        <span className="flex h-9 items-center gap-1 rounded-md border border-gray-100 bg-gray-50 px-3 text-sm font-medium text-gray-300 cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Précédent</span>
        </span>
      )}

      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm select-none">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(p as number)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors",
                p === currentPage
                  ? "bg-emerald-600 text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </Link>
          )
        )}
      </div>

      {hasNext ? (
        <Link
          href={buildHref(currentPage + 1)}
          className="flex h-9 items-center gap-1 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="Page suivante"
        >
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="flex h-9 items-center gap-1 rounded-md border border-gray-100 bg-gray-50 px-3 text-sm font-medium text-gray-300 cursor-not-allowed">
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}

function buildPageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

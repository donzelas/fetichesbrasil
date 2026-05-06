"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { CategoryWithFetishes } from "@/types/database";

interface CategoryAccordionProps {
  categories: CategoryWithFetishes[];
}

export function CategoryAccordion({ categories }: CategoryAccordionProps) {
  return (
    <div className="space-y-2">
      {categories.map((cat) => (
        <CategoryRow key={cat.id} category={cat} />
      ))}
    </div>
  );
}

function CategoryRow({ category }: { category: CategoryWithFetishes }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/50 bg-card transition-all",
        open && "ring-1 ring-primary/30"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/40"
      >
        <span className="text-2xl">{category.emoji}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold leading-tight">{category.name}</span>
          <span className="block text-xs text-muted-foreground">
            {category.fetishes.length} {category.fetishes.length === 1 ? "fetiche" : "fetiches"}
          </span>
        </span>
        <span className="shrink-0 text-muted-foreground">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </span>
      </button>

      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="grid gap-2 border-t border-border/50 bg-card/50 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {category.fetishes.map((f) => (
              <Link
                key={f.id}
                href={`/salas?fetiche=${f.slug}`}
                className="group rounded-lg border border-border/40 bg-background/50 px-3 py-2 transition hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="block text-sm font-medium leading-tight group-hover:text-primary">
                  {f.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

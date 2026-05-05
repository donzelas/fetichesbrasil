import Link from "next/link";
import type { CategoryWithFetishes } from "@/types/database";

interface CategoriesGridProps {
  categories: CategoryWithFetishes[];
}

export function CategoriesGrid({ categories }: CategoriesGridProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Explorar por categoria</h2>
          <p className="text-sm text-muted-foreground">
            Encontre o fetiche perfeito entre nossas {categories.length} categorias
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/salas?categoria=${cat.slug}`}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-5 transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 text-3xl">{cat.emoji}</div>
                <h3 className="font-semibold leading-tight group-hover:text-primary transition">
                  {cat.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cat.fetishes.length} fetiches
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {cat.fetishes.slice(0, 3).map((f) => (
                <span
                  key={f.id}
                  className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {f.name}
                </span>
              ))}
              {cat.fetishes.length > 3 && (
                <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                  +{cat.fetishes.length - 3}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

import { apiFetch } from "@/lib/api";
import { BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Module = { id: string; slug: string; title: string; description?: string };

async function getModules(): Promise<{ modules: Module[]; error: string | null }> {
  try {
    const modules = await apiFetch<Module[]>("/modules");
    return { modules, error: null };
  } catch (error) {
    return {
      modules: [],
      error: error instanceof Error ? error.message : "Failed to load modules",
    };
  }
}

export default async function ModulesPage() {
  const { modules, error } = await getModules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Preparedness Modules</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {modules.length} module{modules.length !== 1 ? "s" : ""} covering every domain of
          household preparedness
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((m) => (
          <Link
            key={m.id}
            href={`/modules/${m.slug}`}
            className="rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent transition-colors p-4 flex items-start gap-3"
          >
            <BookOpen size={18} className="text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">{m.title}</p>
              {m.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{m.description}</p>
              )}
            </div>
            <ChevronRight size={16} className="text-muted-foreground mt-0.5 shrink-0" />
          </Link>
        ))}

        {error && (
          <p className="text-destructive text-sm col-span-2">Unable to load modules: {error}</p>
        )}

        {!error && modules.length === 0 && (
          <p className="text-muted-foreground text-sm col-span-2">
            No modules found. Run <code className="bg-muted px-1 rounded">bun run db:seed</code> to
            populate seed data.
          </p>
        )}
      </div>
    </div>
  );
}

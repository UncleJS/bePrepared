import { apiFetch } from "@/lib/api";
import { BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";

type Module = { id: string; slug: string; title: string; description?: string };

async function getModules(): Promise<Module[]> {
  try {
    return await apiFetch<Module[]>("/modules");
  } catch {
    return [];
  }
}

export default async function ModulesPage() {
  const modules = await getModules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Preparedness Modules</h1>
        <p className="text-muted-foreground text-sm mt-1">
          10 modules covering every domain of household preparedness
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
        {modules.length === 0 && (
          <p className="text-muted-foreground text-sm col-span-2">
            No modules found. Run <code className="bg-muted px-1 rounded">bun run db:seed</code> to populate seed data.
          </p>
        )}
      </div>
    </div>
  );
}

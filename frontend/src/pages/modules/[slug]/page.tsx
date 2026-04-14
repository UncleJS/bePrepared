import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { BookOpen, ChevronRight, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ---------------------------------------------------------------------------
// Types — mirror the API response shape from GET /modules/:slug
// ---------------------------------------------------------------------------
type GuidanceDoc = {
  id: string;
  sectionId: string;
  title: string;
  body: string;
  sortOrder: number;
  badgeJson?: string | null;
};

type Section = {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  sortOrder: number;
  guidanceDocs: GuidanceDoc[];
};

type ModuleDetail = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  iconName?: string | null;
  category: string;
  sortOrder: number;
  sections: Section[];
};

type BadgeConfig = { label: string; message: string; color: string; url?: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseBadges(badgeJson?: string | null): BadgeConfig[] {
  if (!badgeJson) return [];
  try {
    return JSON.parse(badgeJson) as BadgeConfig[];
  } catch {
    return [];
  }
}

function badgeUrl(b: BadgeConfig): string {
  return `https://img.shields.io/badge/${encodeURIComponent(b.label)}-${encodeURIComponent(b.message)}-${encodeURIComponent(b.color)}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ModuleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [mod, setMod] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    apiFetch<ModuleDetail>(`/modules/${slug}`)
      .then(setMod)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingSpinner label="Loading module…" />;
  if (notFound || !mod) return <Navigate to="/modules" replace />;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/modules" className="hover:text-foreground transition-colors">
          Modules
        </Link>
        <ChevronRight size={14} />
        <span className="text-foreground">{mod.title}</span>
      </nav>

      {/* Module header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <BookOpen size={22} className="text-primary" />
          <h1 className="text-2xl font-bold">{mod.title}</h1>
        </div>
        {mod.description && <p className="text-muted-foreground text-sm">{mod.description}</p>}
        <p className="text-xs text-muted-foreground capitalize">
          Category: <span className="text-foreground">{mod.category}</span>
          {" · "}
          {mod.sections.length} section{mod.sections.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Sections */}
      {mod.sections.length === 0 ? (
        <p className="text-muted-foreground text-sm">No sections in this module yet.</p>
      ) : (
        <div className="space-y-8">
          {mod.sections.map((section) => (
            <div key={section.id} className="space-y-4">
              {/* Section heading */}
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <FileText size={16} className="text-primary shrink-0" />
                <h2 className="text-lg font-semibold">{section.title}</h2>
              </div>

              {/* Guidance docs */}
              {section.guidanceDocs.length === 0 ? (
                <p className="text-muted-foreground text-sm pl-4">
                  No guidance documents in this section yet.
                </p>
              ) : (
                <div className="space-y-6 pl-1">
                  {section.guidanceDocs.map((doc) => {
                    const badges = parseBadges(doc.badgeJson);
                    return (
                      <div
                        key={doc.id}
                        className="rounded-lg border border-border bg-card p-4 space-y-3"
                      >
                        {/* Doc title */}
                        <h3 className="font-medium text-sm">{doc.title}</h3>

                        {/* Shields.io badges */}
                        {badges.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {badges.map((b, i) =>
                              b.url ? (
                                <a key={i} href={b.url} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={badgeUrl(b)}
                                    alt={`${b.label}: ${b.message}`}
                                    className="h-5"
                                  />
                                </a>
                              ) : (
                                <img
                                  key={i}
                                  src={badgeUrl(b)}
                                  alt={`${b.label}: ${b.message}`}
                                  className="h-5"
                                />
                              )
                            )}
                          </div>
                        )}

                        {/* Body — rendered as preformatted markdown text */}
                        {/* TODO: swap for <ReactMarkdown> once react-markdown is installed */}
                        <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                          {doc.body}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="pt-2">
        <Link
          to="/modules"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          ← Back to all modules
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { RuleCategoryDTO, RuleSectionDTO } from "@/lib/rules";

function matchesSearch(section: RuleSectionDTO, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const hay = `${section.code} ${section.title} ${section.content}`.toLowerCase();
  return hay.includes(q);
}

function ChevronIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition ${open ? "rotate-90" : ""} ${className ?? "text-zinc-500"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" strokeLinecap="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RulesPageClient({ initialCategories }: { initialCategories: RuleCategoryDTO[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    initialCategories[0]?.id ?? null
  );
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(() => {
    const first = initialCategories[0]?.id;
    return new Set(first ? [first] : []);
  });
  const [search, setSearch] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/rules");
      if (!res.ok) return;
      const data = (await res.json()) as RuleCategoryDTO[];
      setCategories(data);
      if (activeCategoryId && !data.some((c) => c.id === activeCategoryId)) {
        setActiveCategoryId(data[0]?.id ?? null);
        setSelectedSectionId(null);
      }
    } catch {
      /* ignore */
    }
  }, [activeCategoryId]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (hash && categories.some((c) => c.id === hash)) {
      setActiveCategoryId(hash);
      setExpandedCategoryIds((prev) => new Set(prev).add(hash));
      setSelectedSectionId(null);
    }
  }, [categories]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === activeCategoryId) ?? null,
    [categories, activeCategoryId]
  );

  const selectedSection = useMemo(() => {
    if (!selectedSectionId) return null;
    for (const c of categories) {
      const s = c.sections.find((x) => x.id === selectedSectionId);
      if (s) return s;
    }
    return null;
  }, [categories, selectedSectionId]);

  const filteredSections = useMemo(() => {
    if (!activeCategory) return [];
    return activeCategory.sections.filter((s) => matchesSearch(s, search));
  }, [activeCategory, search]);

  const searchMatchesCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return categories.filter((c) => {
      if (c.title.toLowerCase().includes(q)) return true;
      return c.sections.some((s) => matchesSearch(s, search));
    });
  }, [categories, search]);

  function toggleCategoryExpand(id: string) {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectCategory(id: string, collapseDetail = true) {
    setActiveCategoryId(id);
    setExpandedCategoryIds((prev) => new Set(prev).add(id));
    if (collapseDetail) setSelectedSectionId(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  }

  function openSection(section: RuleSectionDTO, categoryId: string) {
    setActiveCategoryId(categoryId);
    setExpandedCategoryIds((prev) => new Set(prev).add(categoryId));
    setSelectedSectionId(section.id);
  }

  const sidebarCategories = searchMatchesCategories ?? categories;

  return (
    <div className="space-y-8 pb-12">
      {/* Page header — title + subtitle left, search right (reference layout) */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-[2.75rem] md:leading-[1.1]">
            Server <span className="brand-text">rules</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Official rule list and community standards. Search by topic — RDM, metagaming, Discord, and more.
          </p>
        </div>
        <div className="relative w-full shrink-0 lg:max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules (e.g. RDM, meta, Discord…)"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-10 pr-3 text-sm text-zinc-100 shadow-inner shadow-black/20 placeholder:text-zinc-600 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
          />
        </div>
      </div>

      {search.trim() && searchMatchesCategories && searchMatchesCategories.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          No rules match that search.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr] lg:gap-8">
        {/* Sidebar — Kategoriler-style accordion */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] brand-text">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800/90 bg-zinc-900/70 text-[var(--accent)]">
              <ListIcon />
            </span>
            Categories
          </p>
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/35 p-2.5 shadow-sm shadow-black/20">
            {categories.length === 0 ? (
              <p className="px-3 py-5 text-sm leading-relaxed text-zinc-500">
                No rule categories yet. Full admins can add them in{" "}
                <Link href="/admin" className="brand-text underline-offset-2 hover:underline">
                  Admin → Rules
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-0.5">
                {sidebarCategories.map((cat) => {
                  const expanded = expandedCategoryIds.has(cat.id);
                  const active = cat.id === activeCategoryId;
                  return (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => {
                          toggleCategoryExpand(cat.id);
                          selectCategory(cat.id, true);
                        }}
                        className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-base transition ${
                          active && !selectedSectionId
                            ? "bg-zinc-800/95 text-white ring-1 ring-[var(--accent)]/40"
                            : active
                              ? "bg-zinc-800/70 text-white"
                              : "text-zinc-300 hover:bg-zinc-800/45"
                        }`}
                      >
                        <ChevronIcon open={expanded} className="text-zinc-500" />
                        <span className="min-w-0 flex-1 truncate font-semibold">{cat.title}</span>
                        <span className="shrink-0 rounded-md border border-zinc-700/80 bg-zinc-950/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-500">
                          {cat.sections.length}
                        </span>
                      </button>
                      {expanded ? (
                        <ul className="ml-2 mt-1 space-y-0.5 border-l-2 border-zinc-800 pl-3">
                          {cat.sections.map((s) => {
                            const isSectionActive = selectedSectionId === s.id;
                            return (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  onClick={() => openSection(s, cat.id)}
                                  className={`relative w-full rounded-lg px-2.5 py-2.5 text-left text-sm transition ${
                                    isSectionActive
                                      ? "bg-zinc-800/90 font-medium text-zinc-50 ring-1 ring-[var(--accent)]/45"
                                      : "text-zinc-400 hover:bg-zinc-800/55 hover:text-zinc-200"
                                  }`}
                                >
                                  {isSectionActive ? (
                                    <span
                                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full brand-bg"
                                      aria-hidden
                                    />
                                  ) : null}
                                  <span className="block pl-1">
                                    {s.code ? (
                                      <span className="font-mono text-xs text-zinc-500">{s.code}</span>
                                    ) : null}
                                    {s.code ? <span className="text-zinc-600"> · </span> : null}
                                    {s.title}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Main — grid OR inline detail (reference: no modal) */}
        <section className="min-w-0 space-y-4">
          {!activeCategory ? (
            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/25 p-8 text-center text-sm text-zinc-500">
              Select a category to browse rules.
            </div>
          ) : selectedSection ? (
            <div>
              <button
                type="button"
                onClick={() => setSelectedSectionId(null)}
                className="mb-5 inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-200"
              >
                <ArrowLeftIcon />
                Subcategories
              </button>

              <div className="mb-8 space-y-2">
                {selectedSection.code ? (
                  <p className="font-mono text-base text-zinc-500 sm:text-lg">{selectedSection.code}</p>
                ) : null}
                <h2 className="text-3xl font-bold tracking-tight brand-text sm:text-4xl md:text-[2.5rem] md:leading-tight">
                  {selectedSection.title}
                </h2>
              </div>

              <div
                className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 sm:p-9"
                style={{
                  boxShadow:
                    "0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent), 0 0 48px -16px color-mix(in srgb, var(--accent) 28%, transparent)",
                }}
              >
                <div className="whitespace-pre-wrap text-lg leading-[1.75] text-zinc-200 sm:text-xl sm:leading-8">
                  {selectedSection.content.trim() || (
                    <span className="text-lg text-zinc-500 sm:text-xl">
                      No content yet — admins can add text in Admin → Rules.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] brand-text">Subcategories</p>
                <span className="h-px flex-1 bg-gradient-to-r from-zinc-700/80 to-transparent" aria-hidden />
              </div>
              {filteredSections.length === 0 ? (
                <p className="rounded-2xl border border-zinc-800/90 bg-zinc-900/25 py-10 text-center text-sm text-zinc-500">
                  No sections in this category match your search.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => openSection(section, activeCategory.id)}
                      className="group flex min-h-[6.25rem] items-stretch gap-4 rounded-2xl border border-zinc-800/90 bg-zinc-950/50 p-5 text-left transition hover:border-[var(--accent)]/45 hover:bg-zinc-900/55"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/90 text-zinc-500 transition group-hover:border-[var(--accent)]/45 group-hover:text-[var(--accent)]">
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          aria-hidden
                        >
                          <path d="M10 8l6 4-6 4V8z" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-lg font-bold leading-snug brand-text sm:text-xl group-hover:underline-offset-2">
                          {section.title}
                        </span>
                        {section.code ? (
                          <span className="mt-2 block font-mono text-sm text-zinc-500 sm:text-base">{section.code}</span>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <p className="text-center text-xs text-zinc-600">
        Content is managed in the admin panel.{" "}
        <button type="button" onClick={() => void refresh()} className="brand-text hover:underline">
          Refresh list
        </button>
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useToast } from "@/components/toast";
import type { RuleCategoryDTO, RuleSectionDTO } from "@/lib/rules";

async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  if (body && typeof body.error === "string" && body.error.trim()) return body.error.trim();
  return `${fallback} (${res.status})`;
}

export function AdminRulesManager() {
  const toast = useToast();
  const [categories, setCategories] = useState<RuleCategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [catTitle, setCatTitle] = useState("");
  const [catSort, setCatSort] = useState("0");
  const [savingCat, setSavingCat] = useState(false);

  const [secCode, setSecCode] = useState("");
  const [secTitle, setSecTitle] = useState("");
  const [secContent, setSecContent] = useState("");
  const [secSort, setSecSort] = useState("0");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [savingSec, setSavingSec] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rules");
      if (!res.ok) {
        toast.addToast(await apiErrorMessage(res, "Failed to load rules"), "error");
        return;
      }
      const data = (await res.json()) as RuleCategoryDTO[];
      setCategories(data);
      setSelectedCategoryId((current) => {
        if (current && data.some((c) => c.id === current)) return current;
        return data[0]?.id ?? null;
      });
    } catch {
      toast.addToast("Failed to load rules", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  async function handleCreateCategory(e: FormEvent) {
    e.preventDefault();
    const title = catTitle.trim();
    if (!title) {
      toast.addToast("Category title required", "error");
      return;
    }
    const sortOrder = Number.parseInt(catSort, 10);
    setSavingCat(true);
    try {
      const res = await fetch("/api/admin/rules/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 }),
      });
      if (!res.ok) {
        toast.addToast(await apiErrorMessage(res, "Could not create category"), "error");
        return;
      }
      toast.addToast("Category created", "success");
      setCatTitle("");
      setCatSort("0");
      await load();
    } catch {
      toast.addToast("Could not create category", "error");
    } finally {
      setSavingCat(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Delete this category and all of its rule sections?")) return;
    try {
      const res = await fetch(`/api/admin/rules/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.addToast(await apiErrorMessage(res, "Delete failed"), "error");
        return;
      }
      toast.addToast("Category deleted", "success");
      await load();
    } catch {
      toast.addToast("Delete failed", "error");
    }
  }

  async function handleUpdateCategorySort(id: string, title: string, sortOrder: number) {
    try {
      const res = await fetch(`/api/admin/rules/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, sortOrder }),
      });
      if (!res.ok) {
        toast.addToast(await apiErrorMessage(res, "Update failed"), "error");
        return;
      }
      toast.addToast("Category updated", "success");
      await load();
    } catch {
      toast.addToast("Update failed", "error");
    }
  }

  function startEditSection(s: RuleSectionDTO) {
    setEditingSectionId(s.id);
    setSecCode(s.code);
    setSecTitle(s.title);
    setSecContent(s.content);
    setSecSort(String(s.sortOrder));
  }

  function clearSectionForm() {
    setEditingSectionId(null);
    setSecCode("");
    setSecTitle("");
    setSecContent("");
    setSecSort("0");
  }

  async function handleSaveSection(e: FormEvent) {
    e.preventDefault();
    if (!selectedCategoryId) {
      toast.addToast("Select a category first", "error");
      return;
    }
    const title = secTitle.trim();
    if (!title) {
      toast.addToast("Section title required", "error");
      return;
    }
    const sortOrder = Number.parseInt(secSort, 10);
    setSavingSec(true);
    try {
      if (editingSectionId) {
        const res = await fetch(`/api/admin/rules/sections/${editingSectionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: secCode.trim(),
            title,
            content: secContent,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
          }),
        });
        if (!res.ok) {
          toast.addToast(await apiErrorMessage(res, "Could not update section"), "error");
          return;
        }
        toast.addToast("Section updated", "success");
      } else {
        const res = await fetch("/api/admin/rules/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: selectedCategoryId,
            code: secCode.trim(),
            title,
            content: secContent,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
          }),
        });
        if (!res.ok) {
          toast.addToast(await apiErrorMessage(res, "Could not create section"), "error");
          return;
        }
        toast.addToast("Section created", "success");
      }
      clearSectionForm();
      await load();
    } catch {
      toast.addToast("Could not save section", "error");
    } finally {
      setSavingSec(false);
    }
  }

  async function handleDeleteSection(id: string) {
    if (!confirm("Delete this rule section?")) return;
    try {
      const res = await fetch(`/api/admin/rules/sections/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.addToast(await apiErrorMessage(res, "Delete failed"), "error");
        return;
      }
      toast.addToast("Section deleted", "success");
      if (editingSectionId === id) clearSectionForm();
      await load();
    } catch {
      toast.addToast("Delete failed", "error");
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading rules…</p>;
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-zinc-400">
        Full admins can organize <strong className="text-zinc-200">categories</strong> (e.g. General, Roleplay,
        Illegal) and <strong className="text-zinc-200">sections</strong> (numbered entries with full text). Visitors
        browse them on the <strong className="text-zinc-200">Rules</strong> and <strong className="text-zinc-200">Community</strong>{" "}
        pages.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-100">Categories</h2>
          <form onSubmit={handleCreateCategory} className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <label className="block text-xs font-medium text-zinc-400">New category title</label>
            <input
              value={catTitle}
              onChange={(e) => setCatTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="e.g. General rules"
            />
            <label className="block text-xs font-medium text-zinc-400">Sort order</label>
            <input
              value={catSort}
              onChange={(e) => setCatSort(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              type="number"
            />
            <button
              type="submit"
              disabled={savingCat}
              className="rounded-lg brand-bg px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-50"
            >
              {savingCat ? "Saving…" : "Add category"}
            </button>
          </form>

          <ul className="space-y-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className={`rounded-xl border px-3 py-2 ${
                  c.id === selectedCategoryId ? "border-[var(--accent)]/50 bg-zinc-900/60" : "border-zinc-800 bg-zinc-950/40"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(c.id)}
                    className="min-w-0 flex-1 text-left text-sm font-medium text-zinc-100"
                  >
                    {c.title}
                  </button>
                  <span className="text-xs text-zinc-500">{c.sections.length} sections</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c.id)}
                    className="rounded border border-red-900/50 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <label className="text-zinc-500">Sort</label>
                  <input
                    defaultValue={c.sortOrder}
                    key={`${c.id}-sort`}
                    id={`sort-${c.id}`}
                    className="w-16 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200"
                    type="number"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById(`sort-${c.id}`) as HTMLInputElement | null;
                      const v = input ? Number.parseInt(input.value, 10) : c.sortOrder;
                      void handleUpdateCategorySort(c.id, c.title, Number.isFinite(v) ? v : c.sortOrder);
                    }}
                    className="rounded border border-zinc-600 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                  >
                    Apply sort
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-100">Sections in category</h2>
          {!selectedCategory ? (
            <p className="text-sm text-zinc-500">Select or create a category.</p>
          ) : (
            <>
              <p className="text-xs text-zinc-500">
                Editing: <strong className="text-zinc-300">{selectedCategory.title}</strong>
              </p>
              <form onSubmit={handleSaveSection} className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {editingSectionId ? "Edit section" : "New section"}
                  </span>
                  {editingSectionId ? (
                    <button
                      type="button"
                      onClick={clearSectionForm}
                      className="text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
                <label className="block text-xs font-medium text-zinc-400">Code (optional)</label>
                <input
                  value={secCode}
                  onChange={(e) => setSecCode(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
                  placeholder="1.1"
                />
                <label className="block text-xs font-medium text-zinc-400">Title</label>
                <input
                  value={secTitle}
                  onChange={(e) => setSecTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  placeholder="Discord rules"
                />
                <label className="block text-xs font-medium text-zinc-400">Content</label>
                <textarea
                  value={secContent}
                  onChange={(e) => setSecContent(e.target.value)}
                  rows={10}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  placeholder="Full rule text (plain text; line breaks preserved)"
                />
                <label className="block text-xs font-medium text-zinc-400">Sort order</label>
                <input
                  value={secSort}
                  onChange={(e) => setSecSort(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  type="number"
                />
                <button
                  type="submit"
                  disabled={savingSec}
                  className="rounded-lg brand-bg px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-50"
                >
                  {savingSec ? "Saving…" : editingSectionId ? "Update section" : "Add section"}
                </button>
              </form>

              <ul className="space-y-2">
                {selectedCategory.sections.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      {s.code ? <span className="font-mono text-xs text-zinc-500">{s.code} · </span> : null}
                      <span className="text-sm text-zinc-200">{s.title}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditSection(s)}
                        className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSection(s.id)}
                        className="rounded border border-red-900/50 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

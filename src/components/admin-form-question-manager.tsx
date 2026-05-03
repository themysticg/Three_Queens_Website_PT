"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useToast } from "@/components/toast";
import type {
  FormQuestionDefinition,
  FormQuestionLayout,
  FormQuestionType,
  FormType,
} from "@/lib/form-questions";
import {
  WHITELIST_REQUIRED_QUESTION_KEYS,
  WHITELIST_RESERVED_QUESTION_KEYS,
} from "@/lib/form-questions";

type EditorState = {
  id: string | null;
  questionKey: string;
  label: string;
  type: FormQuestionType;
  required: boolean;
  placeholder: string;
  optionsText: string;
  layout: FormQuestionLayout;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY_EDITOR: EditorState = {
  id: null,
  questionKey: "",
  label: "",
  type: "text",
  required: true,
  placeholder: "",
  optionsText: "",
  layout: "full",
  sortOrder: "0",
  isActive: true,
};

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:border-[var(--accent)] focus:outline-none";

function toEditorState(question: FormQuestionDefinition): EditorState {
  return {
    id: question.id,
    questionKey: question.questionKey,
    label: question.label,
    type: question.type,
    required: question.required,
    placeholder: question.placeholder ?? "",
    optionsText: question.options.join("\n"),
    layout: question.layout,
    sortOrder: String(question.sortOrder),
    isActive: question.isActive,
  };
}

export function AdminFormQuestionManager() {
  const toast = useToast();
  const [formType, setFormType] = useState<FormType>("whitelist");
  const [questions, setQuestions] = useState<FormQuestionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/form-questions?formType=${formType}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load questions");
        return res.json();
      })
      .then((data) => setQuestions(Array.isArray(data) ? data : []))
      .catch(() => toast.addToast("Failed to load form questions", "error"))
      .finally(() => setLoading(false));
  }, [formType, toast]);

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.sortOrder - b.sortOrder),
    [questions]
  );
  const isReservedWhitelistKey =
    formType === "whitelist" &&
    WHITELIST_RESERVED_QUESTION_KEYS.includes(
      editor.questionKey as (typeof WHITELIST_RESERVED_QUESTION_KEYS)[number]
    );

  function resetEditor() {
    setEditor(EMPTY_EDITOR);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      formType,
      questionKey: editor.questionKey,
      label: editor.label,
      type: editor.type,
      required: editor.required,
      placeholder: editor.placeholder,
      options: editor.optionsText
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean),
      layout: editor.layout,
      sortOrder: Number(editor.sortOrder) || 0,
      isActive: editor.isActive,
    };

    try {
      const response = await fetch(
        editor.id ? `/api/admin/form-questions/${editor.id}` : "/api/admin/form-questions",
        {
          method: editor.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.addToast(data.error || "Failed to save question", "error");
        return;
      }

      setQuestions(Array.isArray(data) ? data : []);
      resetEditor();
      toast.addToast(editor.id ? "Question updated" : "Question added", "success");
    } catch {
      toast.addToast("Failed to save question", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question? Existing answers will remain stored, but the question will disappear from forms.")) {
      return;
    }

    const response = await fetch(`/api/admin/form-questions/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.addToast(data.error || "Failed to delete question", "error");
      return;
    }

    setQuestions(Array.isArray(data) ? data : []);
    if (editor.id === id) resetEditor();
    toast.addToast("Question deleted", "success");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(["whitelist", "staff", "job"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setFormType(type);
              resetEditor();
            }}
            className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
              formType === type
                ? "brand-bg"
                : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {type === "whitelist" ? "Whitelist form" : type === "staff" ? "Staff form" : "Job form"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-zinc-100">
            {editor.id ? "Edit question" : "Add question"}
          </h3>
          {editor.id && (
            <button
              type="button"
              onClick={resetEditor}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Question key
            <input
              value={editor.questionKey}
              onChange={(event) => setEditor((current) => ({ ...current, questionKey: event.target.value }))}
              className={inputClass}
              placeholder="e.g. rp_experience"
              disabled={Boolean(editor.id) && isReservedWhitelistKey}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Label
            <input
              value={editor.label}
              onChange={(event) => setEditor((current) => ({ ...current, label: event.target.value }))}
              className={inputClass}
              placeholder="Question shown to the user"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Type
            <select
              value={editor.type}
              onChange={(event) =>
                setEditor((current) => ({
                  ...current,
                  type: event.target.value as FormQuestionType,
                }))
              }
              className={inputClass}
            >
              <option value="text">Text</option>
              <option value="textarea">Textarea</option>
              <option value="number">Number</option>
              <option value="select">Select</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Placeholder
            <input
              value={editor.placeholder}
              onChange={(event) => setEditor((current) => ({ ...current, placeholder: event.target.value }))}
              className={inputClass}
              placeholder="Optional helper text"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Layout
            <select
              value={editor.layout}
              onChange={(event) =>
                setEditor((current) => ({
                  ...current,
                  layout: event.target.value as FormQuestionLayout,
                }))
              }
              className={inputClass}
            >
              <option value="full">Full width</option>
              <option value="half">Half width</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
            Sort order
            <input
              type="number"
              value={editor.sortOrder}
              onChange={(event) => setEditor((current) => ({ ...current, sortOrder: event.target.value }))}
              className={inputClass}
              placeholder="0"
            />
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-300">
            <input
              type="checkbox"
              checked={editor.required}
              onChange={(event) => setEditor((current) => ({ ...current, required: event.target.checked }))}
            />
            Required
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm font-medium text-zinc-300">
            <input
              type="checkbox"
              checked={editor.isActive}
              onChange={(event) => setEditor((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Active
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-300 lg:col-span-2">
            Select options
            <textarea
              rows={4}
              value={editor.optionsText}
              onChange={(event) => setEditor((current) => ({ ...current, optionsText: event.target.value }))}
              className={inputClass}
              placeholder="One option per line. Only used for select questions."
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="brand-bg w-full rounded-lg px-4 py-3 text-sm font-semibold transition brand-bg-hover disabled:opacity-50 sm:w-auto"
        >
          {saving ? "Saving..." : editor.id ? "Update question" : "Add question"}
        </button>
      </form>

      {loading ? (
        <p className="text-zinc-500">Loading questions...</p>
      ) : (
        <div className="space-y-3">
          {sortedQuestions.map((question) => (
            <article
              key={question.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-zinc-100">{question.label}</span>
                    <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300">
                      {question.type}
                    </span>
                    <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300">
                      {question.layout}
                    </span>
                    {!question.isActive && (
                      <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-medium text-red-300">
                        inactive
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-zinc-500">{question.questionKey}</p>
                  <p className="text-sm text-zinc-400">
                    Order {question.sortOrder} {question.required ? "• required" : "• optional"}
                  </p>
                  {question.placeholder && (
                    <p className="text-sm text-zinc-500">Placeholder: {question.placeholder}</p>
                  )}
                  {question.options.length > 0 && (
                    <p className="text-sm text-zinc-500">
                      Options: {question.options.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditor(toEditorState(question))}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(question.id)}
                    disabled={
                      question.formType === "whitelist" &&
                      WHITELIST_REQUIRED_QUESTION_KEYS.includes(
                        question.questionKey as (typeof WHITELIST_REQUIRED_QUESTION_KEYS)[number]
                      )
                    }
                    className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {question.formType === "whitelist" &&
                WHITELIST_REQUIRED_QUESTION_KEYS.includes(
                  question.questionKey as (typeof WHITELIST_REQUIRED_QUESTION_KEYS)[number]
                ) && (
                  <p className="mt-3 text-xs text-zinc-500">
                    This is a core whitelist field. You can edit its label, placeholder, order, and active state, but not delete it.
                  </p>
                )}
            </article>
          ))}
          {sortedQuestions.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-500">
              No questions found for this form.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

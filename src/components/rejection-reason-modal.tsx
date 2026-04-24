"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title?: string;
  confirmLabel?: string;
};

export function RejectionReasonModal({
  open,
  onClose,
  onConfirm,
  title = "Reject application",
  confirmLabel = "Reject",
}: Props) {
  const [reason, setReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      // Focus textarea when modal opens
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm(reason.trim());
    onClose();
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rejection-modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 id="rejection-modal-title" className="text-lg font-semibold text-zinc-100">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            Add an optional reason. The applicant will see this in their Discord notification.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-4">
          <label htmlFor="rejection-reason" className="mb-2 block text-sm font-medium text-zinc-300">
            Rejection reason (optional)
          </label>
          <textarea
            ref={textareaRef}
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Application didn't meet our requirements. You may reapply later."
            rows={3}
            className="mb-4 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

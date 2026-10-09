"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { createUploadAction, registerUploadAction } from "@/features/steps/actions";
import { formatBytes } from "@/lib/format/file";
import { createClient } from "@/lib/supabase/browser";
import { t } from "@/i18n/nb";

const u = t.client.upload;

type Status = { kind: "busy" | "ok" | "error"; text: string };

// Drag-and-drop or file picker. Each file goes straight to Storage through a signed URL
// (so large files never pass through the app server), then gets registered on the step.
export function UploadPanel({
  projectId,
  stepId,
  maxBytes,
  allowedTypes,
  acceptHint,
}: {
  projectId: string;
  stepId: string;
  maxBytes: number;
  allowedTypes: string[];
  acceptHint?: string[];
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const busy = statuses.some((s) => s.kind === "busy");

  async function uploadOne(file: File, index: number) {
    const set = (status: Status) => setStatuses((list) => list.map((s, i) => (i === index ? status : s)));
    const type = file.type || "application/octet-stream";

    if (file.size > maxBytes) return set({ kind: "error", text: u.tooLarge(file.name, formatBytes(maxBytes)) });
    if (!allowedTypes.includes(type)) return set({ kind: "error", text: u.wrongType(file.name) });

    const ticket = await createUploadAction(projectId, stepId, { name: file.name, size: file.size, type });
    if (!ticket.ok) {
      return set({ kind: "error", text: ticket.error === "too_large" ? u.tooLarge(file.name, formatBytes(maxBytes)) : ticket.error === "wrong_type" ? u.wrongType(file.name) : u.failed(file.name) });
    }

    const { error } = await createClient().storage.from("project-files").uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: type });
    if (error) return set({ kind: "error", text: u.failed(file.name) });

    const registered = await registerUploadAction(stepId, { path: ticket.path, name: file.name, size: file.size, type });
    set(registered.ok ? { kind: "ok", text: u.uploaded(file.name) } : { kind: "error", text: u.failed(file.name) });
  }

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setStatuses(list.map((f) => ({ kind: "busy", text: u.uploading(f.name) })));
    // One at a time keeps progress readable and avoids hammering slow mobile connections.
    for (const [i, file] of list.entries()) await uploadOne(file, i);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!busy) void handle(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        // The input is visually hidden, so the whole drop zone shows keyboard focus.
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-4 has-[input:focus-visible]:outline-ink ${
          dragging ? "border-accent bg-surface" : "border-field-border bg-surface/60"
        }`}
      >
        <p>
          <span className="hidden sm:inline">{u.drop} </span>
          {/* The real control is a native file input, so keyboards and screen readers just work. */}
          <label htmlFor={inputId} className="cursor-pointer font-medium underline underline-offset-4">
            <span className="sm:hidden">{u.heading}</span>
            <span className="hidden sm:inline">{u.choose}</span>
          </label>
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          disabled={busy}
          accept={(acceptHint?.length ? acceptHint : allowedTypes).join(",")}
          onChange={(e) => void handle(e.target.files)}
          className="sr-only"
          aria-describedby={`${inputId}-limits`}
        />
        <p id={`${inputId}-limits`} className="text-sm text-muted">
          {u.limits(formatBytes(maxBytes))}
        </p>
      </div>

      <ul aria-live="polite" className="flex flex-col gap-1 text-sm">
        {statuses.map((s, i) => (
          <li key={i} className={s.kind === "error" ? "font-medium text-danger" : s.kind === "ok" ? "text-success" : "text-muted"}>
            <span aria-hidden="true">{s.kind === "error" ? "⚠ " : s.kind === "ok" ? "✓ " : "… "}</span>
            {s.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

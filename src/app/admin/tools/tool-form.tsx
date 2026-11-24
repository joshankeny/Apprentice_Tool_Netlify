"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { saveTool } from "./actions";
import { MAX_TOOL_PHOTO_BYTES, TOOL_PHOTO_TYPES, TOOL_STATUSES, type Tool, type ToolFamily } from "./tool-fields";

export function ToolForm({
  tool,
  families,
  imageUrl
}: {
  tool?: Tool;
  families: ToolFamily[];
  imageUrl?: string;
}) {
  const [state, submit, pending] = useActionState(saveTool.bind(null, tool?.id ?? null), { error: null });
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState("");
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || photoError) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => submit(formData));
  }

  const visiblePhoto = photo ? preview : imageUrl;

  return (
    <form onSubmit={onSubmit} className="card grid admin-tool-form">
      {tool && <input type="hidden" name="updated_at" value={tool.updated_at} />}
      <div className="grid grid-2">
        <label>Formal name<input name="formal_name" defaultValue={tool?.formal_name} required /></label>
        <label>Common name<input name="common_name" defaultValue={tool?.common_name ?? ""} /></label>
        <label>
          Tool family
          <select name="family_id" required={!tool} defaultValue={tool?.family_id ?? ""}>
            <option value="" disabled={!tool}>{tool ? "Unassigned" : "Select a family"}</option>
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name}{family.active ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={tool?.status ?? "draft"}>
            {Object.entries(TOOL_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      <label>Use description<textarea name="use_description" rows={4} defaultValue={tool?.use_description ?? ""} /></label>
      <label>Normally carried or stored<input name="location" defaultValue={tool?.location ?? ""} /></label>
      <div className="grid admin-photo-field">
        {visiblePhoto && <img src={visiblePhoto} alt={photo ? "Selected tool photo" : "Current tool photo"} />}
        <label>
          {imageUrl ? "Replace photo" : "Add photo"}
          <input
            type="file"
            name="image"
            accept={TOOL_PHOTO_TYPES}
            aria-describedby="tool-photo-help"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              const tooLarge = Boolean(selected && selected.size > MAX_TOOL_PHOTO_BYTES);
              setPhotoError(tooLarge ? "This photo is over 4 MB. Choose a smaller copy." : "");
              setPreview("");
              setPhoto(tooLarge ? undefined : selected);
            }}
          />
        </label>
        <small id="tool-photo-help" className="muted">JPEG, PNG, WebP, or GIF. Up to 4 MB.</small>
        {photoError && <p className="warning" role="alert">{photoError}</p>}
      </div>
      {state.error && <p className="warning" role="alert">{state.error}</p>}
      <div className="admin-actions">
        <button type="submit" className="button" disabled={pending || Boolean(photoError)}>
          {pending ? "Saving…" : "Save Tool"}
        </button>
        <Link href="/admin/tools" className="button secondary">Cancel</Link>
      </div>
    </form>
  );
}

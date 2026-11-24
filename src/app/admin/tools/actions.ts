"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { MAX_TOOL_PHOTO_BYTES, TOOL_STATUSES, type ToolSaveState } from "./tool-fields";

const toolFields = z.object({
  formal_name: z.string().trim().min(1, "Enter a formal name."),
  common_name: z.string().trim().transform((value) => value || null),
  family_id: z.union([z.uuid(), z.literal("")]).transform((value) => value || null),
  use_description: z.string().trim().transform((value) => value || null),
  location: z.string().trim().transform((value) => value || null),
  status: z.enum(Object.keys(TOOL_STATUSES))
});

const toolVersion = z.iso.datetime({ offset: true });
const tradeValue = z.enum(["unset", "true", "false"]).transform((value) =>
  value === "unset" ? null : value === "true"
);
const tradeFields = z.object({ is_wire: tradeValue, is_line: tradeValue, is_meter: tradeValue });

function readToolTrades(formData: FormData) {
  return tradeFields.safeParse({
    is_wire: formData.get("is_wire"),
    is_line: formData.get("is_line"),
    is_meter: formData.get("is_meter")
  });
}

function nextToolVersion(previous: string) {
  return new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
}

type TradeSaveResult = { error: boolean; message: string } | null;

export async function saveToolTrades(toolId: string, _previous: TradeSaveResult, formData: FormData): Promise<TradeSaveResult> {
  const { supabase } = await requireAdmin();
  const version = toolVersion.safeParse(formData.get("updated_at"));
  if (!z.uuid().safeParse(toolId).success || !version.success) {
    return { error: true, message: "Refresh the catalog to edit this tool." };
  }

  const trades = readToolTrades(formData);
  if (!trades.success) return { error: true, message: "Choose Unset, Yes, or No for each trade." };

  const { data, error } = await supabase.from("tools")
    .update({ ...trades.data, updated_at: nextToolVersion(version.data) })
    .eq("id", toolId)
    .eq("updated_at", version.data)
    .select("id")
    .maybeSingle();

  if (error) return { error: true, message: "The app could not confirm the save. Refresh before trying again." };
  if (!data) return { error: true, message: "This tool changed while you were editing it. Refresh before trying again." };

  revalidatePath("/admin/tools");
  return { error: false, message: "Trades saved." };
}

function photoFormat(bytes: Uint8Array) {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);

  if (startsWith([0xff, 0xd8, 0xff])) return { extension: "jpg", contentType: "image/jpeg" };
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: "png", contentType: "image/png" };
  }
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return { extension: "webp", contentType: "image/webp" };
  }
  if (startsWith([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || startsWith([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) {
    return { extension: "gif", contentType: "image/gif" };
  }
  return null;
}

export async function saveTool(
  toolId: string | null,
  _previousState: ToolSaveState,
  formData: FormData
): Promise<ToolSaveState> {
  const { supabase } = await requireAdmin();
  const version = formData.get("updated_at");
  if (toolId && (!z.uuid().safeParse(toolId).success || !toolVersion.safeParse(version).success)) {
    return { error: "This edit form is out of date. Reopen the tool and try again." };
  }

  const parsed = toolFields.safeParse({
    formal_name: formData.get("formal_name"),
    common_name: formData.get("common_name"),
    family_id: formData.get("family_id"),
    use_description: formData.get("use_description"),
    location: formData.get("location"),
    status: formData.get("status")
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const trades = readToolTrades(formData);
  if (!trades.success) return { error: "Choose Unset, Yes, or No for each trade." };
  if (!toolId && !parsed.data.family_id) return { error: "Select a tool family." };

  const photo = formData.get("image");
  const bucket = supabase.storage.from("tool-images");
  let photoPath: string | undefined;

  if (photo instanceof File && (photo.name || photo.size > 0)) {
    if (photo.size === 0 || photo.size > MAX_TOOL_PHOTO_BYTES) {
      return { error: "Select a photo under 4 MB or use a smaller copy." };
    }
    const contents = await photo.arrayBuffer();
    const format = photoFormat(new Uint8Array(contents));
    if (!format) return { error: "Choose a JPEG, PNG, WebP, or GIF photo." };

    const path = `${crypto.randomUUID()}.${format.extension}`;
    const { error } = await bucket.upload(path, contents, {
      contentType: format.contentType,
      upsert: false
    });
    if (error) {
      console.error("Could not upload tool photo", error);
      return { error: "The photo could not be uploaded. Try again with a smaller image." };
    }
    photoPath = path;
  }

  const values = {
    ...parsed.data,
    ...trades.data,
    ...(photoPath ? { image_path: photoPath } : {})
  };
  const change = toolId
    ? supabase.from("tools").update({
        ...values,
        updated_at: nextToolVersion(String(version))
      }).eq("id", toolId).eq("updated_at", version)
    : supabase.from("tools").insert(values);

  const { data, error, status } = await change.select("id").maybeSingle();

  if (error || !data) {
    // A lost response can leave a saved row. Only remove the upload after a definite rejection.
    if (photoPath && (!error || (status >= 400 && status < 500))) {
      const { error: cleanupError } = await bucket.remove([photoPath]);
      if (cleanupError) console.error("Could not remove unlinked tool photo", cleanupError);
    }
    if (!error && toolId) {
      return { error: "This tool changed while you were editing it. Reopen it and apply your edits again." };
    }
    console.error("Could not save tool", error);
    return { error: "The app could not confirm the save. Check the tool catalog before trying again." };
  }

  revalidatePath("/admin/tools");
  redirect(`/admin/tools?saved=${toolId ? "edited" : "added"}`);
}

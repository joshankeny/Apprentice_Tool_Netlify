"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export async function createTool(formData: FormData) {
  const { supabase } = await requireAdmin();

  const formalName = String(formData.get("formal_name") ?? "").trim();
  const commonName = String(formData.get("common_name") ?? "").trim();
  const familyId = String(formData.get("family_id") ?? "").trim();
  const useDescription = String(formData.get("use_description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const difficultyRaw = String(formData.get("difficulty") ?? "").trim();
  const status = String(formData.get("status") ?? "draft").trim();
  const commonlyMissed = formData.get("is_commonly_missed") === "on";
  const image = formData.get("image");

  if (!formalName || !familyId) {
    throw new Error("Formal name and family are required.");
  }

  let imagePath: string | null = null;

  if (image instanceof File && image.size > 0) {
    const extension = image.name.split(".").pop()?.toLowerCase() || "jpg";
    imagePath = `${crypto.randomUUID()}.${extension}`;
    const arrayBuffer = await image.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("tool-images")
      .upload(imagePath, arrayBuffer, {
        upsert: false,
        contentType: image.type || "application/octet-stream"
      });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }
  }

  const { error } = await supabase.from("tools").insert({
    formal_name: formalName,
    common_name: commonName || null,
    family_id: familyId,
    use_description: useDescription || null,
    location: location || null,
    difficulty: difficultyRaw ? Number(difficultyRaw) : null,
    image_path: imagePath,
    is_commonly_missed: commonlyMissed,
    status
  });

  if (error) {
    if (imagePath) {
      await supabase.storage.from("tool-images").remove([imagePath]);
    }
    throw new Error(`Tool insert failed: ${error.message}`);
  }

  redirect("/admin/tools");
}

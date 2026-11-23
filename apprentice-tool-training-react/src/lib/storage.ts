export function publicToolImageUrl(supabaseUrl: string, imagePath: string | null) {
  if (!imagePath) return "";
  const encodedPath = imagePath.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/tool-images/${encodedPath}`;
}

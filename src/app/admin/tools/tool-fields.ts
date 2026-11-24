export const TOOL_STATUSES = {
  draft: "Draft",
  published: "Published",
  archived: "Archived"
} as const;

export type ToolStatus = keyof typeof TOOL_STATUSES;

export type Tool = {
  id: string;
  formal_name: string;
  common_name: string | null;
  family_id: string | null;
  use_description: string | null;
  location: string | null;
  difficulty: number | null;
  is_commonly_missed: boolean;
  status: ToolStatus;
  image_path: string | null;
  updated_at: string;
};

export type ToolFamily = { id: string; name: string; active: boolean };
export type ToolSaveState = { error: string | null };

export const MAX_TOOL_PHOTO_BYTES = 4 * 1024 * 1024;
export const TOOL_PHOTO_TYPES = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";

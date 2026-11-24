export const THEME_COOKIE = "apprentice-theme";

export type Theme = "system" | "light" | "dark";

export function resolveTheme(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

import "next-themes"

declare module "next-themes/dist/types" {
  interface UseThemeProps {
    /** Optional forced theme injected by ThemeProvider */
    forcedTheme?: string
  }
}

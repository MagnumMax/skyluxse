# Tooling Matrix — 9 Nov 2025

| Stack Component | LTS / Target Version | Command Used | Result (excerpt) | Notes |
| --- | --- | --- | --- | --- |
| Node.js | v20.11.1 (Active LTS) | `npm_config_fetch_timeout=60000 npm view node dist-tags --json` | `"v20-lts": "20.11.1"` | Installed via `nvm install 20.11.1` and set as default shell runtime. |
| Next.js App Router | v16.0.1 (stable release channel) | `npm view next dist-tags --json` | `"latest": "16.0.1"` | Installed deps `next@16.0.1 react@19 react-dom@19` for RSC baseline. |
| Tailwind CSS | v4.1.17 | `npm view tailwindcss dist-tags --json` | `"latest": "4.1.17"` | Configured with `tailwind.config.ts` + `app/globals.css` per Tailwind v4 guidance (Context7 `/tailwindlabs/tailwindcss.com`). |
| shadcn/ui CLI | v3.5.0 | `npx shadcn@latest -v` | `3.5.0` | CLI initialised (`components.json`) + base components (Button/Card/Dialog/Sheet/Navigation Menu). |
| Supabase JS Client | v2.80.0 | `npm view @supabase/supabase-js dist-tags --json` | `"latest": "2.80.0"` | Version reserved for later Supabase integration work; not yet installed in Block 1. |

## Shadcn CLI Usage — 13 Nov 2025

1. Run `pnpm dlx shadcn@latest add <component ...>` from the repo root. This keeps the CLI up to date without committing it to dependencies.
2. For prompts about existing primitives (e.g., `button.tsx`, `label.tsx`), answer `n` to keep our customised files. To automate “no”, wrap the command with `yes n | …`. Use `--overwrite` only after diffing local tweaks.
3. When targeting private registries, export `REGISTRY_TOKEN=<value>` before executing the CLI; all registry URLs must be HTTPS per shadcn guidance.
4. After generating components, run `pnpm lint && pnpm typecheck` to ensure new Radix peer deps are satisfied, then commit the resulting `components/ui/*.tsx` files alongside the dependency updates in `package.json`/`package-lock.json`.
5. For any registry item JSON we add later, place `@import` statements first, then `@plugin`, followed by other CSS entries so Tailwind 4 consumes directives in the expected order.

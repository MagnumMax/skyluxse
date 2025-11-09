# Tooling Matrix — 9 Nov 2025

| Stack Component | LTS / Target Version | Command Used | Result (excerpt) | Notes |
| --- | --- | --- | --- | --- |
| Node.js | v20.11.1 (Active LTS) | `npm_config_fetch_timeout=60000 npm view node dist-tags --json` | `"v20-lts": "20.11.1"` | Installed via `nvm install 20.11.1` and set as default shell runtime. |
| Next.js App Router | v16.0.1 (stable release channel) | `npm view next dist-tags --json` | `"latest": "16.0.1"` | Installed deps `next@16.0.1 react@19 react-dom@19` for RSC baseline. |
| Tailwind CSS | v4.1.17 | `npm view tailwindcss dist-tags --json` | `"latest": "4.1.17"` | Configured with `tailwind.config.ts` + `app/globals.css` per Tailwind v4 guidance (Context7 `/tailwindlabs/tailwindcss.com`). |
| shadcn/ui CLI | v3.5.0 | `npx shadcn@latest -v` | `3.5.0` | CLI initialised (`components.json`) + base components (Button/Card/Dialog/Sheet/Navigation Menu). |
| Supabase JS Client | v2.80.0 | `npm view @supabase/supabase-js dist-tags --json` | `"latest": "2.80.0"` | Version reserved for later Supabase integration work; not yet installed in Block 1. |

# Cloudflare deployment: state, risks, and the path to main = production

Worker `thumbnail-anti-slop`, account `b71f9d7ad7980d19db9f2d1d380f047a` (Workers Builds, GitHub
`RumbleGitHub/thumbnail-anti-slop`). Checked 2026-11-07 in the dashboard and against the official docs
listed at the end.

## 1. Current configuration (observed)

| Setting | Value | Note |
|---|---|---|
| Production branch | `feat/create-minimal-redesign` | Temporary, set to let the creator test unmerged work. |
| Production build command | `npm run build` (`next build`) | |
| Production deploy command | `npx wrangler deploy` | No Wrangler config in that branch, so Wrangler **autoconfigures** OpenNext on every build. |
| Builds for preview branches | On | New Workers use **Worker Previews** (`wrangler preview`) by default. |
| Previews Base preview command | `npx wrangler setup --yes --build && npx wrangler versions upload` | Changed on 2026-11-06 in an attempt to work around the failure; **builds still ran `npx wrangler preview`**, so this value has no effect and should be reset. |
| Runtime variables / secrets | none | `COMPLEMENTARY_ENGINES_ENABLED` unset → engines **off** (documented default). No `OPENAI_API_KEY`/`GEMINI_API_KEY` → Analyze/Create run the local engine (`isLocal: true`). |
| Bindings (production) | `IMAGES`, `WORKER_SELF_REFERENCE`, `ASSETS` | Created by OpenNext autoconfig. |

Live evidence (2026-11-07): `POST /api/ai/simple-create` with `x-debug-trace: true` returns
`isLocal: true` and no `theme`/`spatialHierarchyPlan`, i.e. complementary engines are disabled.

### Consequences of the temporary production branch

- The public URL serves `feat/create-minimal-redesign`, which is **not reviewed or merged**.
- Any push to that branch deploys production immediately; pushes to `main` only start (failing) preview builds.
- Every other branch preview fails: `wrangler preview` requires a Wrangler config with a `previews`
  block, and the repository had none ("Your Wrangler configuration is missing a `previews` block").
  This is why empty commits and branch switching were needed.

## 2. Repository-side changes (this branch, safe until merged)

- `wrangler.jsonc`: the exact configuration OpenNext autoconfig generates for this app
  (`@opennextjs/cloudflare migrate` 1.20.16), with the production `compatibility_date` (2026-11-04),
  `observability.enabled`, and an empty `"previews": {}` block.
- `open-next.config.ts`, `public/_headers`, `package.json` scripts (`deploy`, `preview`, `upload`,
  `cf-typegen`), `@opennextjs/cloudflare` dependency, `wrangler` 4.158.0 dev dependency
  (Worker Previews need ≥ 4.135.0, and Workers Builds uses the version in `package.json`).
- `next.config.ts`: `initOpenNextCloudflareForDev()` (local `next dev` bindings only).
- `.gitignore` / ESLint ignore `.open-next/` and `.wrangler/`.

Verified locally: `npm test`, `tsc`, `npm run lint`, `next build`, `npx opennextjs-cloudflare build`,
`npx wrangler deploy --dry-run` (bindings: `WORKER_SELF_REFERENCE`, `IMAGES`, `ASSETS`).
**Not verifiable locally:** `wrangler preview` has no dry-run; a real preview needs a push.

With a config file present, Wrangler no longer autoconfigures, so **the dashboard commands must
change at the same time** (section 3). Merging this config into `main` before changing the commands
would make the production build fail (`.open-next/worker.js` would not exist).

## 3. Account-level actions (need the owner's approval, in this order)

1. Merge the reviewed work (PR) into `main`.
2. Settings → Build → **Production**: Build command `npx opennextjs-cloudflare build`,
   Deploy command `npx wrangler deploy`, Production branch **`main`**. Save. This triggers a
   production build of `main` (the first deploy from the committed config).
3. Settings → Build → **Previews Base**: Build command `npx opennextjs-cloudflare build`,
   Preview command **`npx wrangler preview`** (reset the custom value above).
4. Runtime variables: previews do **not** inherit production variables or secrets. Decide per
   environment whether `COMPLEMENTARY_ENGINES_ENABLED=true` should be set (Production and Previews Base
   toggles under Settings → Variables and Secrets, or `previews.vars` in `wrangler.jsonc`).
5. Optional: protect preview URLs with Cloudflare Access (they are public by default, `noindex`).

No one-way migration is needed: this Worker was created after Worker Previews became the default
(its preview builds already run `npx wrangler preview`). The one-way "Switch to Worker Previews"
step in the docs applies only to older Workers on the previous preview model.

Result: `main` = production; every other branch gets
`<branch>-thumbnail-anti-slop.rumblegamer.workers.dev`; GitHub PRs get a build comment and check run.

## Sources

- https://developers.cloudflare.com/workers/previews/ and /previews/configuration/, /previews/resources/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/ and /builds/build-branches/
- https://developers.cloudflare.com/workers/framework-guides/automatic-configuration/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- https://opennext.js.org/cloudflare/get-started

# Workflows

## Purpose

Automate **evidence and distribution** for the public showcase. This is not Wallpaper Engine packaging.

## Architecture overview

```mermaid
flowchart LR
  push[push main or PR]
  test[yarn test]
  build[yarn build]
  docsCheck[USAGE headings]
  pagesCheck[dist index play embed]
  artifact[pages artifact]
  pages[GitHub Pages]
  push --> test --> build --> docsCheck --> pagesCheck
  pagesCheck --> artifact
  artifact --> pages
```

`pages.yml` runs on pull requests (test + build + usage-doc and usage-page checks) and on `main` (also upload + deploy). Enable **Settings → Pages → GitHub Actions** once on the GitHub repo. Site URL: `https://luandev.github.io/fluid-wallpaper/`. Recipes: [docs/USAGE.md](../../docs/USAGE.md).

## Paradigms

- CI uses the same scripts humans run: `yarn test`, `yarn build`.
- Corepack satisfies the pinned Yarn version from `packageManager`.
- Relative Vite `base` means the artifact is `dist/` as-is.

## Enforced patterns

- Use npm only for package packing/publishing and isolated consumer verification (DEC-014); repository installation/builds stay Yarn.
- Do not deploy from pull requests.
- Do not commit `dist/` or secrets.
- Do not add extra required local commands; Pages is CI-only.
- Keep `actions/checkout`, `setup-node` (Node 24 for Pages and npm release), `upload-pages-artifact`, and `deploy-pages` as the deploy path ([DEC-007](../../docs/DECISIONS.md#dec-007--github-pages-showcase)).

## Key files

- `pages.yml`

`release.yml` publishes version tags using npm OIDC and creates GitHub Releases. Both workflows validate packed consumers; Pages asserts all seven HTML entries. See [release setup and lifecycle](../../docs/RELEASE.md).

Both workflows run the bounded Chrome ECO/background gate after build and retain its JSON report. Failures block deployment/publishing; timings are observations, not universal performance claims. See [ECO evidence](../../docs/ECO.md#validation).

The build additionally emits six /docs/ pages (including shaders/technique). Browser validation covers reference search, gallery selection, transparent layering and native/React heroes; source preset previews are validated by tests.

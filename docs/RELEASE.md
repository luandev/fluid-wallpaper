# Preview package releases

## Artifacts and scope

`yarn build` creates `package-dist/` (npm library) and `dist/` (showcase + docs + wallpaper entry). `yarn dev` prepares the library before starting Vite; restart after changing library source to refresh compiled integration demos. The root manifest is private and Yarn-only. Publish **only the generated package**, never the repository root. Desktop zip: `yarn pack:wallpaper` ([DEC-019](DECISIONS.md#dec-019---multi-host-html-wallpaper-pack)).

The npm artifact is ESM-only and includes inline shaders, declarations, CSS, README and MIT license. Root and `/react` export the existing React 19 API; React consumers explicitly import `/styles.css`. `/element`, `/element/auto`, `/engine` and `/config` have no React runtime dependency. `/element/auto` registers `<fluid-ink>` on import and works as a version-pinned browser module. The ordinary element entry registers only when `defineFluidInk()` is called.

This is a preview distribution of current behavior. React configuration remains initial-only. The two-liquid solver, full dashboard isolation and mobile performance are not certified. See [usage](USAGE.md), [package README](PACKAGE_README.md), [decision DEC-014](DECISIONS.md#dec-014--compiled-npm-preview-and-tag-releases), and [physical evidence](TWO_LIQUID.md).

## One-time npm setup

1. Confirm that your npm account can publish `fluid-wallpaper`. Name availability/ownership has not been verified by this implementation. Stop if unavailable; select a new identity explicitly before release.
2. Merge the workflow and package changes into `main`. Enable Actions with permission to create GitHub Releases. No npm secret is needed for routine releases.
3. For a new package with no trusted-publisher settings yet, obtain the validated `npm-package` artifact from the first tag run. That run may fail at publication until bootstrap is complete. In an authenticated maintainer terminal, run `npm publish ./fluid-wallpaper-0.1.0-next.0.tgz --access public --tag next`. Publish that exact CI artifact, not a locally rebuilt replacement. This is the one-time interactive authentication step; do not commit credentials.
4. In npm package settings, configure the trusted publisher: GitHub owner `luandev`, repository `fluid-wallpaper`, workflow filename `release.yml`, no environment name. Allow direct `npm publish` (not only staging). Rerun the failed tag workflow to complete the matching GitHub Release.

The release job uses a GitHub-hosted runner, Node 24 and npm ≥11.5.1. OIDC provides short-lived authentication and automatic provenance for CI-published versions; a manually bootstrapped version must not be claimed to have CI provenance. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## Cut a release

1. Update the root `package.json` version, add its `## VERSION` section to `CHANGELOG.md`, and update version-pinned examples in `usage.html`, `docs/USAGE.md` and `docs/PACKAGE_README.md`.
2. Run `yarn test` and `yarn build`, review the artifact and merge the change into `main`.
3. Tag that commit, for example `git tag v0.1.0-next.0`, then `git push origin v0.1.0-next.0`.

The workflow verifies the tag/version/changelog and `main` ancestry, packs the generated manifest, validates the extracted artifact, and installs it into isolated vanilla and React consumer fixtures. Consumer installs use npm with normal lifecycle behavior and do not alter the repository lockfile. Prereleases publish to `next`; stable versions publish to `latest`. A matching GitHub Release carries notes, the tarball and its SHA-256 checksum.

The publish job is serialized. A rerun checks registry SHA-512 integrity against the newly built tarball; identical published versions skip npm publication and finish the GitHub Release. A mismatch fails. Never overwrite or move a released tag. A fix requires a new version. A registry outage or authorization error must fail, not be treated as an unpublished version.

PRs validate package consumers but never publish/deploy. Local agent dependency installs remain blocked; missing dependencies must be reported. Repository installs/builds use Yarn; npm is permitted only for packaging, publication and isolated CI consumer validation under DEC-014.

## Validation record — 2026-09-15

- `yarn test`: 118 tests passed, including tag/channel/changelog validation.
- `yarn build`: library, declarations (directory barrel imports rewritten to `/index.js`), Pages entries, export/allowlist checks, standalone dependency graph, SSR imports and declaration path resolution passed.
- `node scripts/check-eco-browser.mjs`: passed on Windows with installed Chrome (SwiftShader). Gallery card selection, mobile docs overflow (`minmax(0, 1fr)`), React probe `NODE_ENV` define, and a 180s probe budget are covered. Host timings remain observations, not absolute FPS gates.
- `npm pack` of `package-dist/`, `check-package` on the extracted tarball, and isolated vanilla/React `check-consumers` installs passed locally (Node 24, existing Yarn deps; consumer installs used npm in `.consumer-check/` only).
- Environment: Windows, Node 24.5.0, Vite 7.3.6 / Vitest 3.2.7. No repository lockfile changes.
- Still external: GitHub Actions on the release tag, npm ownership/trusted-publisher bootstrap, actual `npm publish`, CDN availability, and device/mobile visual certification.

## Validation record — 2026-09-14

- `yarn test`: 106 tests passed, including tag/channel/changelog validation.
- `yarn build`: library, declarations, seven Pages entries, export/allowlist checks, standalone dependency graph and SSR imports passed.
- `npm pack` and checks of the extracted tarball passed. A strict NodeNext TypeScript check of generated React/element declarations passed using existing dependencies; this is not a clean consumer installation.
- Environment: Windows, Node 24.15.0, existing Vite 7.3.6 / Vitest 3.2.7. Temporary command launchers outside the repository replaced missing Windows `tsc`, `vite` and `vitest` launchers. No dependencies were installed or lockfiles changed.
- Browser rendering checks could not complete: remote-browser requests to the local preview timed out, and serving built assets through the browser harness did not return. Local HTTP access to the guide returned 200. No rendered, lifecycle, shader or mobile validation is claimed for this release change.
- Clean npm consumer installs are configured in CI but were not run locally because local dependency installs are prohibited. GitHub Actions execution, npm ownership/trusted-publisher setup, actual publication and CDN availability remain external gates.

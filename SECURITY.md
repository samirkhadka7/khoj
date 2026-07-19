# Security

## CI/CD security pipeline

Every push and pull request to `main` runs `.github/workflows/ci.yml`, which has
five independent jobs. A red check on any of them blocks the change.

| Job | What it checks | Fails when |
| --- | --- | --- |
| **Server — typecheck + build** | `npm ci`, `tsc --noEmit`, `tsc` build | A type error or compile error in `server/`. |
| **Client — lint + build** | `npm ci`, `next lint`, `next build` | An ESLint error or a failed Next.js build in `client/`. |
| **SAST — Semgrep** | Static analysis with community rulesets | Any **ERROR-severity** finding (see below). |
| **Dependency audit** | `npm audit` on both packages | A **high**-severity vuln in `server/`, or a **critical** in `client/`. |
| **Docker build check** | `docker build` of both images | Either `Dockerfile` fails to build. |

### SAST (Semgrep)

Runs `semgrep scan` with the public community rulesets `p/owasp-top-ten`,
`p/nodejsscan`, `p/javascript`, and `p/react`. It uses `--oss-only`, so it needs
**no account, no token, and no paid tier** — the rulesets are fetched from the
public registry. The build fails on `ERROR`-severity findings (`--severity=ERROR
--error`).

Two categories are handled deliberately:

- **Suppressed false positives** are marked inline with `// nosemgrep: <rule>` and
  a justification comment (currently: hCaptcha's *public* test secret in
  `hcaptcha.ts`, and an already-`escapeRegex`-escaped pattern in the audit-log
  filter).
- **`node_nosqli_injection` is excluded at the pipeline level.** njsscan flags every
  `Model.find({ ...userInput })`, but this app strips Mongo operators from
  `req.body`/`query`/`params` globally with `express-mongo-sanitize` (see
  `server.ts`), which neutralises the class. If that middleware is ever removed,
  re-enable the rule by deleting the `--exclude-rule` flag in the workflow.

### Dependency audit

- **Server** hard-fails on **high** (currently clean, 0 vulnerabilities).
- **Client** hard-fails on **critical**, and reports **high** as a non-blocking
  step. The remaining client highs are advisories in **Next.js 14.2.x** (and a
  dev-only `eslint-config-next` → `glob` chain). Fixing them requires a **major
  Next.js upgrade**, which is a breaking change scheduled as a deliberate,
  separately-verified migration rather than an automatic `npm audit fix --force`.
  Dependabot opens the upgrade PR (below).

### Dependabot

`.github/dependabot.yml` opens weekly dependency-update PRs for `server/`,
`client/`, and the GitHub Actions themselves, so vulnerable packages surface (and
the Next.js upgrade lands) as reviewable PRs.

## Reading a failed run

Open the failed job in the **Actions** tab and read the failing step:

- **typecheck / build** — the compiler/Next error points at the file and line; fix it.
- **SAST** — Semgrep prints the rule id, file, line, and a `sg.run/...` link.
  Either fix the code, or (if it's a verified false positive) suppress it inline
  with `// nosemgrep: <rule-id>` **plus a one-line justification** — never a bare
  blanket ignore.
- **audit** — run `npm audit` locally in the package; `npm audit fix` handles
  non-breaking fixes. Only use `--force` after confirming the breaking upgrade
  doesn't regress the app.
- **docker** — reproduce with `docker build ./server` / `docker build ./client`.

## Reporting a vulnerability

This is a university coursework project. To report a security issue, open a GitHub
issue (or contact the maintainer) with steps to reproduce; please don't post a
working exploit publicly before it's addressed.

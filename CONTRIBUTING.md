# Contributing to CardioAI

Thanks for contributing. This document describes how we branch, commit, and merge code so `main` stays stable at all times.

We use a **two-tier branch strategy**:

```
feature/xxx  →  PR  →  dev    (everyday work merges here)
dev          →  PR  →  main   (only when dev is stable/tested)
```

- **`dev`** is the integration branch — all feature/fix work merges here first.
- **`main`** is always stable and deployable. It's only updated by merging `dev` into it, once `dev` has been tested and is in a known-good state.

---

## 1. Branch Strategy

- `main` — always stable and deployable. **No direct commits.** Only updated via a reviewed PR from `dev`.
- `dev` — integration branch. **No direct commits.** Only updated via reviewed pull requests from feature branches.
- `feature/<module>-<short-description>` — one branch per feature or task, branched off `dev`.
- `fix/<short-description>` — for bug fixes, branched off `dev`.
- `docs/<short-description>` — for documentation-only changes, branched off `dev`.

### Examples
```
feature/patient-auth
feature/daily-checkin-form
feature/ml-risk-model
feature/prolog-triage-engine
feature/doctor-scheduling
feature/rag-chatbot
feature/notification-service
fix/appointment-overlap-bug
docs/update-architecture-diagram
```

Delete feature branches after they're merged.

---

## 2. Workflow

### A. Everyday feature/fix work → merges into `dev`

1. Pull the latest `dev`:
   ```bash
   git checkout dev
   git pull origin dev
   ```
2. Create a new branch off `dev`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes in small, logical commits (see commit convention below).
4. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a Pull Request with base branch **`dev`** (not `main`) using the PR template.
6. Request a review. Address any feedback.
7. Once approved and checks pass, merge using **Squash and Merge**.
8. Delete the branch after merging.

### B. Promoting `dev` → `main` (stable releases)

Done occasionally, once `dev` has accumulated a working, tested set of features — not after every single merge.

1. Pull the latest `dev`:
   ```bash
   git checkout dev
   git pull origin dev
   ```
2. Open a Pull Request with base branch `main` and compare branch `dev`.
3. Review as usual — confirm everything in `dev` has been tested together.
4. Merge (regular merge is fine here, since you generally want to preserve `dev`'s history on `main` rather than squashing a whole batch of features into one commit).
5. Tag the release if useful, e.g. `git tag v0.1.0`.

---

## 3. Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>
```

| Type | Use for |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that doesn't fix a bug or add a feature |
| `test` | Adding or updating tests |
| `chore` | Tooling, config, dependencies |

### Examples
```
feat: add daily symptom MCQ form
fix: correct doctor availability overlap bug
docs: add system architecture diagram
refactor: split ML service from backend API
test: add unit tests for Prolog triage rules
```

---

## 4. Pull Request Guidelines

Every PR should include:
- **What** changed
- **Why** it changed
- **How to test** it
- Screenshots (if UI-related)
- Linked issue, if applicable

Keep PRs focused and reasonably small — one feature or fix per PR. Large, unrelated changes bundled together are harder to review and more likely to introduce bugs.

---

## 5. Code Review Expectations

- At least one approval required before merging (self-review if working solo, but still go through the checklist).
- Resolve all review comments before merging.
- CI checks (once configured) must pass before merge.

---

## 6. Module Ownership Reference

| Folder | Area |
|---|---|
| `frontend/` | Patient / Doctor / Admin / Visitor UI |
| `backend/` | Core API, auth, business logic |
| `ml-service/` | UCI-trained risk prediction model |
| `prolog-engine/` | Daily symptom triage rules |
| `rag-chatbot/` | Visitor chatbot + knowledge base |
| `notification-service/` | Web Push / SMS / Email dispatch |
| `docs/` | Architecture docs and diagrams |

When opening a PR, prefix the title with the module if helpful, e.g. `[ml-service] Add UCI dataset preprocessing script`.

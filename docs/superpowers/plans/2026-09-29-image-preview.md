# ImagePreview / ZoomableView Implementation Plan

**Goal:** Add reusable main-thread image zoom and a controlled/uncontrolled fullscreen preview to the user's fork without changing main.

**Architecture:** Pure geometry and gesture state machine, a shared rendering surface, a standalone ZoomableView facade, and an ImagePreview composed with the existing Dialog. One pointer at base scale pages or dismisses; zoomed and multi-touch sessions never page. Source is integrated into the existing aggregate package for this initial fork implementation; no new workspace dependencies or lockfile changes are required. Standalone package extraction and its normal scaffold are deferred until the native implementation is verified.

**Tech stack:** ReactLynx 0.123.1, @lynx-js/types 4.1.0, main-thread scripts, Vitest.

**Scope:** Pin to fork main 0d2f7b83f0283f0a816ea3ab46bbe85bd8cc135c. Do not sync upstream, edit existing components, change workflows, publish to npm, or merge main.

## Tasks

- [x] Write failing numeric and gesture tests, then implement the state machine.
- [x] Implement a transform surface with stable touch coordinates, interruptible animation, imperative controls, and cleanup.
- [x] Implement preview paging, image load/error handling, controlled index/visibility, and explicit close/navigation controls.
- [x] Register examples, exports, test discovery, documentation, and a changeset.
- [x] Run available tests and syntax checks; report full workspace/native validation separately.

## Review focus

- Pointer identity changes and two-to-one touch transitions must not jump or accidentally navigate.
- Pinch focal points and narrow/wide content must stay within correct bounds.
- Touch cancellation, remounts, viewport changes, and stale callbacks must not navigate.
- A controlled parent may decline a navigation or close request; the visual surface must recover.
- Failed/empty/replaced images and invalid numeric input must not create stale state or NaN transforms.

## Environment

The execution container cannot resolve GitHub/npm hosts. GitHub connector reads and writes are available. A complete clone, dependency installation, repository scaffold and full workspace build cannot run here. The core tests are executed against the real TypeScript source using an offline TypeScript transpilation and Node's built-in test runner. This is not a Vitest or native rendering pass.

## Verification record — 2026-09-29

- Initial model tests: 28 failing against stubs, then 28 passing against the implementation.
- Review regression: interrupted offsets reproduced (33 passing, 1 failing), then fixed (34 passing).
- Final dependency-free runner: 34 tests, 34 passed, 0 failed, 0 skipped; exit 0.
- Strict TypeScript check of `model.ts`: exit 0.
- Syntax transpilation of 14 TS/TSX/MJS files: 0 syntax errors. This is not a dependency-aware type check.
- Local runtime: Node 22.16.0. Full repository toolchain remains Node 24 / pnpm 10.33.2.
- `pnpm turbo build`, `pnpm test --run`, `pnpm check:all`: attempted; exit 127 (`pnpm: command not found`).
- Full checkout/dependency retrieval was blocked by container DNS resolution. No native device was attached or used.
- Independent review agent unavailable; the implementation was reviewed inline. No screenshots, benchmarks, native smoke passes or CI success are claimed.

Ruling: Keep initial source in the existing aggregate package and examples in the existing Swiper example package to avoid unverified lockfile/dependency edits. This costs separate-package imports until a later reviewed extraction, but preserves the existing public import path and requires no new runtime dependencies.

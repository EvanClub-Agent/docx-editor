## Why

Tier 1 (#706) and the Tier 2 "clean half" (#710) unified the React/Vue editor's pure logic and layout pipeline. Routing both adapters through one `computeLayout` surfaced the **silent divergences** that drift created — places where React and Vue render or behave differently for the same document, with no test catching it. Tier 3 (the third bucket in #696) is the deliberate pass to _pick a canonical behavior for each divergence_ and make both adapters match, plus close the Vue render-option gaps the clean half left open.

This change also scopes the **remaining Tier 2** work (view lifecycle + the load/save source-of-truth inversion) that was deferred from #710, so the two efforts are tracked together as "finish the engine."

## What Changes

### Tier 3 — resolve the divergences (each: pick canonical, make both match, add a parity test)

1. **Header/footer resolution section properties.** React resolves HF against `finalSectionProperties ?? initialSectionProperties` (`useHeaderFooterEditing.ts:51`); Vue resolves against `initialSp` (`useDocxEditor.ts`). For a multi-section doc whose last section declares different HF references or `titlePg`, the adapters paint different headers/footers. React is also internally inconsistent (resolves HF from the _final_ section but gates `titlePg` from the _initial_ `sectionProperties` it passes to `computeLayout`). **Canonical: resolve HF from the same `sectionProperties` the layout uses** (self-consistent — Vue's current behavior), and add a multi-section parity fixture.
2. **Vue render-option gaps.** `computeLayout` returns `headerDistancePx`/`footerDistancePx`/`pageBorders`, but Vue's `renderPages` call drops them (React passes them). **Canonical: Vue passes the full render-option set** so page borders and authored HF distances render in Vue.
3. **`resolvedCommentIds`.** React passes resolved comment IDs into `renderPages` (sidebar resolution); Vue passes none. This is an intended divergence (Vue has no comment sidebar today) — **document it as intentional**, not a gap to close, and assert it in the parity contract so it doesn't silently flip.
4. **Column-width semantics (engine limitation now reachable from Vue).** `w:cols equalWidth="0"` with explicit per-column `w:col w:w` widths renders equal-width in both adapters (the engine's `ColumnLayout` has no per-column width array; `calculateColumnWidth` always divides evenly), and a mid-document section's `separator`/`equalWidth` is dropped (`section-breaks.ts:110`). **Decide:** fix the engine to honor explicit/unequal column widths + carry `separator` across section breaks, or document as a known limitation. (Leaning fix, since "Vue now supports columns" sets the expectation.)
5. **`#670` overlay scroll offset.** Vue's image-overlay adds `scrollTop`, React doesn't — **intentional, keep** (documented in the existing project note); assert it stays adapter-supplied.

### Remaining Tier 2 — view lifecycle + session seam (the harder half)

6. **PM view lifecycle** — body EditorView + `Map<rId, EditorView>` for header/footer, behind a `mountView`/`destroyView` seam, with the enumerate/diff/mount/teardown/writeback steps in core and the reactive-vs-imperative trigger adapter-side.
7. **Load/save session seam** — a **source-of-truth inversion**: the engine becomes the document owner; React's `useHistory`/agent/comment-extraction effects and Vue's `document.value` become subscribers. Includes the load race guard and selective-save-via-agent (Vue needs a `DocumentAgent` wired first). **Gated on the #89 (vanilla package) decision** — the inversion only pays for itself if a framework-free build is wanted.

## Capabilities

### New Capabilities

- `engine-divergence-resolution`: the canonical-behavior decisions (HF resolution, render-option parity, documented-intentional divergences) + parity fixtures that lock them.

### Modified Capabilities

- `engine-view-lifecycle` (from `engine-spine-tier2`): unchanged scope, now sequenced as remaining-Tier-2 step.
- `engine-session` (from `engine-spine-tier2`): unchanged scope, gated on #89.

## Impact

- **`@eigenpal/docx-editor-vue`**: gains page-border + HF-distance rendering (#2), self-consistent HF resolution (#1), and — if #4 is fixed — correct unequal-column layouts.
- **`@eigenpal/docx-editor-react`**: HF-resolution self-consistency fix (#1) is a behavior change for multi-section docs; everything else is additive or unchanged.
- **`@eigenpal/docx-editor-core`**: column-width engine fix (#4) if taken; the view-lifecycle + session modules for remaining Tier 2.
- **Risk**: #1 and #4 change rendering for specific multi-section / multi-column docs — round-trip-test against Word. The session inversion (#7) is the highest-risk item and is decision-gated.

> **This is a DRAFT / planning change.** It scopes and sequences the remaining engine work after the #710 clean half; it is not itself an implementation. Items #1-#3 are small and shippable independently; #4 is an engine feature; #6-#7 are the deferred Tier 2 half.

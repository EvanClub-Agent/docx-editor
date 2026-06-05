## Context

After #710 (Tier 2 clean half) both adapters call one `computeLayout`. The parity review of that PR found the divergences enumerated here by comparing the exact inputs each adapter passes. This change records the canonical resolution for each and scopes the deferred Tier 2 half. Source-of-truth for the divergences (file:line) is the #710 parity review.

## Goals / Non-Goals

**Goals:** one canonical behavior per divergence; both adapters match; a parity fixture locks each so it can't silently drift again. Scope + sequence the remaining Tier 2 (views + session) so the engine can be finished.

**Non-Goals:** implementing the source-of-truth inversion here (it's decision-gated on #89); changing the overlay-painting strategy (#670 stays adapter-specific).

## Decisions

**1. HF resolution — resolve from the layout's own section properties (canonical = self-consistent).**
The bug is that React resolves HF from `final ?? initial` but gates `titlePg` from `initial`. Two inputs, two sections — internally inconsistent. The fix makes HF resolution and `titlePg` gating read the _same_ `sectionProperties`. Vue already does this (`initialSp` for both); React changes to match. Trade: React multi-section docs whose final section overrides HF refs will resolve differently than today — but today's React behavior is the inconsistent one, so this is a correctness fix, not a regression. Round-trip a multi-section + distinct-final-HF fixture against Word to confirm the canonical choice matches Word's "HF belongs to its section" model. (If Word actually wants the _final_ section's HF for the trailing pages, flip the canonical to final-and-gate-from-final — decide with the fixture, not in the abstract.)

**2. Render-option parity — Vue passes the full set.** `computeLayout` already returns `headerDistancePx`/`footerDistancePx`/`pageBorders`; Vue just stops dropping them at the `renderPages` call. Pure additive for Vue (page borders + authored HF distances now render). No React change.

**3. Intentional divergences get asserted, not closed.** `resolvedCommentIds` (Vue has no comment sidebar) and the #670 overlay `scrollTop` offset (Vue scroll model) are deliberate. Add them to the parity contract's documented-divergence list so a future change can't flip them by accident.

**4. Column-width semantics — fix the engine (recommended) or document.** Today `ColumnLayout = {count, gap, equalWidth?, separator?}` carries `equalWidth`/`separator` but the paginator never reads them (`calculateColumnWidth` always divides evenly) and `section-breaks.ts:110` drops them across breaks. Fixing means: add per-column widths to `ColumnLayout`, have `getColumns` read `SectionProperties.columns[]`, honor them in `calculateColumnWidth`, and preserve `separator`/`equalWidth` in `getColumnConfig`. This is an engine feature (affects React too, equally). Because #710 advertises "Vue now supports columns", a 3-column newsletter with `equalWidth="0"` rendering as 3 equal columns is a likely perceived-regression — so fixing is preferred. Sequence it independently of the divergence cleanups (#1-#3), which are cheap.

**5. Remaining Tier 2 stays as scoped in `engine-spine-tier2` (steps 4-5).** View lifecycle (step 4) is liftable now. The load/save inversion (step 5) is gated on #89: only invert the document source-of-truth into the engine if a vanilla build needs it; otherwise leave session adapter-side and stop the engine at the layout/scheduler/transaction loop (already shipped).

## Risks / Trade-offs

- **[#1 HF resolution changes multi-section rendering]** → gate on a Word round-trip fixture; the canonical choice is _decided by the fixture_, not asserted blind.
- **[#4 column fix touches the shared paginator]** → affects both adapters; cover with multi-column + unequal-width + mid-break-separator fixtures before/after.
- **[#7 session inversion]** highest-risk, decision-gated — do not start until #89 is decided.

## Open Questions

- Does Word attach trailing-page HF to the final section or the initial? (Resolve #1 canonical via fixture.)
- Is #89 (vanilla package) wanted this cycle? (Gates #7.)
- Fix #4 now or file as a tracked limitation? (Leaning fix.)

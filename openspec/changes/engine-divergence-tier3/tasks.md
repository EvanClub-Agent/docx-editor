Draft / planning change. Items 1-3 are small and independently shippable; 4 is an engine feature; 5-6 are the deferred Tier 2 half. Each behavior change ships with a parity fixture and a changeset.

## 1. HF resolution — pick canonical + make both match

- [ ] 1.1 Build a multi-section fixture whose final section overrides header/footer references and `titlePg`; open it in Word and record which HF Word paints on the trailing pages (the canonical answer).
- [ ] 1.2 Make HF resolution and `titlePg` gating read the same `sectionProperties` in both adapters (React `useHeaderFooterEditing.ts:51` currently uses `final ?? initial` while gating from initial; align to the canonical from 1.1).
- [ ] 1.3 Add the fixture to the parity suite (`e2e/tests/parity/`) asserting React == Vue == Word-expected HF.

## 2. Vue render-option parity

- [ ] 2.1 Vue `renderPages` call passes `headerDistance`/`footerDistance`/`pageBorders` from the `computeLayout` result.
- [ ] 2.2 Parity fixtures: a `w:pgBorders` doc and a non-default-HF-distance doc render identically in React and Vue.

## 3. Lock intentional divergences

- [ ] 3.1 Add `resolvedCommentIds` (React-only) and the `#670` overlay `scrollTop` offset (Vue-only) to the parity contract's documented-divergence bucket so they can't silently flip.

## 4. Column-width semantics (engine feature — decide first)

- [ ] 4.1 Decide: fix or document. (Leaning fix — #710 advertises Vue column support.)
- [ ] 4.2 If fixing: add per-column widths to `ColumnLayout` (`layout-engine/types.ts`); `getColumns` reads `SectionProperties.columns[]`; `calculateColumnWidth` (`paginator.ts:54`) honors explicit/unequal widths; `getColumnConfig` (`section-breaks.ts:110`) preserves `separator`/`equalWidth` across breaks.
- [ ] 4.3 Fixtures: 3-column `equalWidth="0"` newsletter; mid-document `w:sep="1"` section change.

## 5. Remaining Tier 2 — PM view lifecycle (liftable now)

- [ ] 5.1 Lift body + per-rId HF view create/teardown/writeback into the engine behind a `mountView`/`destroyView` seam (`engine.syncHfViews`); keep the reactive-vs-imperative trigger adapter-side. (Scope: `engine-spine-tier2` step 4 / spec `engine-view-lifecycle`.)

## 6. Remaining Tier 2 — load/save session seam (GATED on #89)

- [ ] 6.1 Decide #89 (vanilla package). If not wanted, leave session adapter-side and close Tier 2 at the layout/scheduler/transaction loop already shipped.
- [ ] 6.2 If wanted: invert document source-of-truth into the engine (`engine.load` with race guard, `engine.save({selective})`); React `useHistory`/agent/comment-extraction and Vue `document.value` become subscribers. Wire a `DocumentAgent` into Vue first. (Scope: `engine-spine-tier2` step 5 / spec `engine-session`.)

## 7. Close-out

- [ ] 7.1 Update CLAUDE.md once the engine owns view lifecycle (and session, if taken).
- [ ] 7.2 Update #696 with Tier 3 + remaining-Tier-2 status; note #89 follow-up.

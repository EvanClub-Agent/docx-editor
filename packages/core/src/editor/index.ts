/**
 * `core/editor/` — shared stateful-orchestration spine for the React/Vue
 * adapters (issue #696 Tier 2). Currently the pure layout COMPUTE pass; the
 * scheduler, transaction loop, view lifecycle, and session seam land here as
 * the tier proceeds.
 */

export { computeLayout } from './computeLayout';
export type { ComputeLayoutInputs, LayoutComputation, MeasureBlocksFn } from './computeLayout';

## ADDED Requirements

### Requirement: Canonical header/footer resolution

React and Vue SHALL resolve a section's header/footer against the SAME `sectionProperties` used to gate `titlePg` and lay out the section — i.e. HF resolution and `titlePg` gating read one section's properties, not two. The adapters SHALL produce identical header/footer rendering for the same document, including multi-section documents whose final section declares different header/footer references or `titlePg`. The canonical choice (initial vs final section for trailing pages) SHALL be validated against Word with a multi-section fixture.

#### Scenario: Multi-section doc renders identical HF in both adapters

- **WHEN** a document has a final section with header/footer references different from the first section
- **THEN** React and Vue paint the same header/footer on each page, and the result matches Word

#### Scenario: titlePg gating is self-consistent

- **WHEN** the section whose HF is resolved has `titlePg` set
- **THEN** the first-page HF gating uses that same section's `titlePg` (not a different section's)

### Requirement: Render-option parity in Vue

The Vue adapter SHALL pass the full `renderPages` option set returned by `computeLayout` — including `headerDistance`, `footerDistance`, and `pageBorders` — so authored header/footer distances and page borders render in Vue as they do in React.

#### Scenario: Page borders render in Vue

- **WHEN** a document declares `w:pgBorders`
- **THEN** the Vue editor renders the page borders, matching React

#### Scenario: Authored HF distance honored in Vue

- **WHEN** a section sets a non-default header or footer distance
- **THEN** Vue positions the header/footer at that distance, matching React

### Requirement: Intentional divergences are documented and asserted

Divergences that are deliberate — `resolvedCommentIds` (React-only, Vue has no comment sidebar) and the `#670` overlay `scrollTop` offset (Vue-only scroll model) — SHALL be recorded as intentional in the parity contract so a future change cannot flip them without an explicit decision.

#### Scenario: Intentional divergence is locked

- **WHEN** the parity contract is checked
- **THEN** `resolvedCommentIds` and the overlay offset appear in the documented-divergence bucket, not flagged as gaps

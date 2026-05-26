---
'@eigenpal/docx-editor-core': patch
---

Fix header/footer table column widths in paged-render mode when the source DOCX
emits an equalized `w:tblGrid` alongside non-equal per-cell `w:tcW` values. The
painter now derives column widths from cell widths in this case — matching
Word's autofit reconciliation and the inline-edit view. Fixed-layout tables
(`<w:tblLayout w:type="fixed"/>`) keep the grid as authoritative per spec.

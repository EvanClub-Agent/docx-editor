/**
 * Regression test for issue #468 — header/footer table geometry diverges
 * between paged-render and inline-edit modes when the source DOCX emits an
 * equalized w:tblGrid alongside explicit per-cell w:tcW values.
 *
 * The PM table spec already renders cells off w:tcW, so the inline editor is
 * fine. Without the cell-width derivation in `convertTable`, the painter side
 * fed the equalized tblGrid through `measureTableBlock`, which then equalized
 * every column. This test guards `toFlowBlocks` directly so the regression
 * cannot reappear if the painter is later rewritten.
 */

import { describe, test, expect } from 'bun:test';
import { headerFooterToProseDoc, toProseDoc } from '../../prosemirror/conversion/toProseDoc';
import { toFlowBlocks } from '../toFlowBlocks';
import { twipsToPixels as px } from '../toFlowBlocks/shared';
import type { Document, HeaderFooter, Table } from '../../types/document';

function fourColCellRow(widths: [number, number, number, number]) {
  return {
    type: 'tableRow' as const,
    cells: widths.map((w) => ({
      type: 'tableCell' as const,
      formatting: { width: { value: w, type: 'dxa' as const } },
      content: [{ type: 'paragraph' as const, content: [] }],
    })),
  };
}

function makeTable(columnWidths: number[], cellRowWidths: [number, number, number, number]): Table {
  return {
    type: 'table',
    columnWidths,
    rows: [fourColCellRow(cellRowWidths)],
  };
}

describe('toFlowBlocks — table column widths (#468)', () => {
  test('cell widths override an equalized tblGrid when totals agree', () => {
    // Mirrors DC_Template_Descricao_Cargo_Controlado_Enterprise.docx header1:
    // tblGrid: 2551 × 4 twips (equalized) but cells: 1814/4762/1587/2041.
    const table = makeTable([2551, 2551, 2551, 2551], [1814, 4762, 1587, 2041]);
    const hf: HeaderFooter = { type: 'header', hdrFtrType: 'default', content: [table] };
    const pmDoc = headerFooterToProseDoc(hf.content);
    const blocks = toFlowBlocks(pmDoc);
    const tableBlock = blocks.find((b) => b.kind === 'table');
    expect(tableBlock?.kind).toBe('table');
    const expected = [1814, 4762, 1587, 2041].map(px);
    const got = tableBlock!.columnWidths!;
    expect(got.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(Math.abs(got[i] - expected[i])).toBeLessThan(0.001);
    }
  });

  test('a non-equalized tblGrid is preserved when cells agree', () => {
    // Word-authored table with intentionally distinct grid columns and cells
    // sized to match: derived widths equal grid widths, no override happens.
    const table = makeTable([2000, 3000, 2500, 2500], [2000, 3000, 2500, 2500]);
    const doc: Document = { package: { document: { content: [table] } } };
    const pmDoc = toProseDoc(doc);
    const blocks = toFlowBlocks(pmDoc);
    const tableBlock = blocks.find((b) => b.kind === 'table');
    const expected = [2000, 3000, 2500, 2500].map(px);
    const got = tableBlock!.columnWidths!;
    for (let i = 0; i < 4; i++) {
      expect(Math.abs(got[i] - expected[i])).toBeLessThan(0.001);
    }
  });

  test('an equalized tblGrid with equalized cells is left alone', () => {
    // No mismatch to fix — derived widths and grid widths agree, override
    // condition does not trigger.
    const table = makeTable([2551, 2551, 2551, 2551], [2551, 2551, 2551, 2551]);
    const doc: Document = { package: { document: { content: [table] } } };
    const pmDoc = toProseDoc(doc);
    const blocks = toFlowBlocks(pmDoc);
    const tableBlock = blocks.find((b) => b.kind === 'table');
    const got = tableBlock!.columnWidths!;
    expect(got.length).toBe(4);
    expect(got.every((w) => Math.abs(w - got[0]) < 0.001)).toBe(true);
  });

  test('grid-only table (no per-cell w:tcW) still uses grid widths', () => {
    const tableNoCellWidths: Table = {
      type: 'table',
      columnWidths: [2000, 3000, 2500, 2500],
      rows: [
        {
          type: 'tableRow',
          cells: [0, 1, 2, 3].map(() => ({
            type: 'tableCell' as const,
            content: [{ type: 'paragraph' as const, content: [] }],
          })),
        },
      ],
    };
    const doc: Document = { package: { document: { content: [tableNoCellWidths] } } };
    const pmDoc = toProseDoc(doc);
    const blocks = toFlowBlocks(pmDoc);
    const tableBlock = blocks.find((b) => b.kind === 'table');
    const expected = [2000, 3000, 2500, 2500].map(px);
    const got = tableBlock!.columnWidths!;
    for (let i = 0; i < 4; i++) {
      expect(Math.abs(got[i] - expected[i])).toBeLessThan(0.001);
    }
  });

  test('cells-only table (no tblGrid) infers widths from the first row', () => {
    const tableNoGrid: Table = {
      type: 'table',
      rows: [fourColCellRow([1814, 4762, 1587, 2041])],
    };
    const doc: Document = { package: { document: { content: [tableNoGrid] } } };
    const pmDoc = toProseDoc(doc);
    const blocks = toFlowBlocks(pmDoc);
    const tableBlock = blocks.find((b) => b.kind === 'table');
    const expected = [1814, 4762, 1587, 2041].map(px);
    const got = tableBlock!.columnWidths!;
    expect(got.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(Math.abs(got[i] - expected[i])).toBeLessThan(0.001);
    }
  });

  test('fixed-layout table opts out of the override (grid is authoritative)', () => {
    // <w:tblLayout w:type="fixed"/> tells Word to honor the grid strictly
    // (ECMA-376 §17.4.52). Even when cells disagree we keep the grid widths.
    const table: Table = {
      type: 'table',
      formatting: { layout: 'fixed' },
      columnWidths: [2551, 2551, 2551, 2551],
      rows: [fourColCellRow([1814, 4762, 1587, 2041])],
    };
    const doc: Document = { package: { document: { content: [table] } } };
    const pmDoc = toProseDoc(doc);
    const blocks = toFlowBlocks(pmDoc);
    const tableBlock = blocks.find((b) => b.kind === 'table');
    const expected = [2551, 2551, 2551, 2551].map(px);
    const got = tableBlock!.columnWidths!;
    expect(got.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(Math.abs(got[i] - expected[i])).toBeLessThan(0.001);
    }
  });
});

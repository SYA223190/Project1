import { describe, it, expect } from "vitest";
import { computeLineTax, aggregateTaxTotals } from "../tax/index.js";

describe("computeLineTax — exclusive pricing", () => {
  it("computes simple 8% tax correctly", () => {
    const result = computeLineTax({
      qty: 1,
      unitPrice: 100,
      taxes: [{ id: "t1", rate: 0.08, isCompound: false }],
    });
    expect(result.subtotal).toBe(100);
    expect(result.taxableAmount).toBe(100);
    expect(result.taxLines[0]?.taxAmount).toBe(8);
    expect(result.totalTax).toBe(8);
    expect(result.total).toBe(108);
  });

  it("computes multiple non-compound taxes additively", () => {
    const result = computeLineTax({
      qty: 2,
      unitPrice: 50,
      taxes: [
        { id: "t1", rate: 0.05, isCompound: false },
        { id: "t2", rate: 0.03, isCompound: false },
      ],
    });
    // subtotal = 100, each applied to 100
    expect(result.subtotal).toBe(100);
    expect(result.taxLines[0]?.taxAmount).toBe(5);
    expect(result.taxLines[1]?.taxAmount).toBe(3);
    expect(result.totalTax).toBe(8);
    expect(result.total).toBe(108);
  });

  it("computes compound tax on top of simple tax", () => {
    const result = computeLineTax({
      qty: 1,
      unitPrice: 100,
      taxes: [
        { id: "t1", rate: 0.10, isCompound: false },
        { id: "t2", rate: 0.05, isCompound: true },
      ],
    });
    // t1 = 100 × 0.10 = 10
    // t2 = (100 + 10) × 0.05 = 5.5
    expect(result.taxLines[0]?.taxAmount).toBe(10);
    expect(result.taxLines[1]?.taxAmount).toBe(5.5);
    expect(result.totalTax).toBe(15.5);
    expect(result.total).toBe(115.5);
  });

  it("handles zero discount", () => {
    const result = computeLineTax({
      qty: 3,
      unitPrice: 100,
      discount: 0,
      taxes: [{ id: "t1", rate: 0.10, isCompound: false }],
    });
    expect(result.subtotal).toBe(300);
    expect(result.totalTax).toBe(30);
  });

  it("subtracts discount before applying tax", () => {
    const result = computeLineTax({
      qty: 1,
      unitPrice: 200,
      discount: 50,
      taxes: [{ id: "t1", rate: 0.10, isCompound: false }],
    });
    // subtotal = 200 - 50 = 150
    expect(result.subtotal).toBe(150);
    expect(result.taxLines[0]?.taxAmount).toBe(15);
    expect(result.total).toBe(165);
  });

  it("returns zero tax for zero-rate tax", () => {
    const result = computeLineTax({
      qty: 1,
      unitPrice: 100,
      taxes: [{ id: "t-exempt", rate: 0, isCompound: false }],
    });
    expect(result.totalTax).toBe(0);
    expect(result.total).toBe(100);
  });
});

describe("computeLineTax — inclusive pricing", () => {
  it("back-calculates taxable amount for inclusive 10% tax", () => {
    const result = computeLineTax({
      qty: 1,
      unitPrice: 110,
      taxes: [{ id: "t1", rate: 0.10, isCompound: false }],
      taxInclusive: true,
    });
    // taxable = 110 / 1.10 = 100
    expect(result.taxableAmount).toBe(100);
    expect(result.taxLines[0]?.taxAmount).toBe(10);
    expect(result.total).toBe(110); // inclusive: total == subtotal
  });

  it("handles multiple inclusive taxes", () => {
    const result = computeLineTax({
      qty: 1,
      unitPrice: 115,
      taxes: [
        { id: "t1", rate: 0.10, isCompound: false },
        { id: "t2", rate: 0.05, isCompound: false },
      ],
      taxInclusive: true,
    });
    // taxable = 115 / 1.15 = 100
    expect(result.taxableAmount).toBe(100);
    expect(result.total).toBe(115);
  });
});

describe("aggregateTaxTotals", () => {
  it("groups tax amounts across multiple lines", () => {
    const line1 = computeLineTax({
      qty: 1, unitPrice: 100,
      taxes: [{ id: "t1", rate: 0.10, isCompound: false }],
    });
    const line2 = computeLineTax({
      qty: 2, unitPrice: 50,
      taxes: [{ id: "t1", rate: 0.10, isCompound: false }],
    });
    const totals = aggregateTaxTotals([line1, line2]);
    // t1: 10 + 10 = 20
    expect(totals.get("t1")).toBe(20);
  });

  it("handles multiple distinct taxes", () => {
    const line = computeLineTax({
      qty: 1, unitPrice: 100,
      taxes: [
        { id: "t1", rate: 0.05, isCompound: false },
        { id: "t2", rate: 0.03, isCompound: false },
      ],
    });
    const totals = aggregateTaxTotals([line]);
    expect(totals.get("t1")).toBe(5);
    expect(totals.get("t2")).toBe(3);
  });
});

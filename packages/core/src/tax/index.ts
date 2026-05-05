/**
 * Tax Engine
 *
 * Computes per-line tax amounts following the spec §5.
 * Supports: simple taxes, compound taxes, tax groups,
 * inclusive and exclusive pricing.
 */

export interface TaxDef {
  id: string;
  rate: number;      // decimal e.g. 0.08
  isCompound: boolean;
}

export interface TaxLineResult {
  taxId: string;
  taxAmount: number;
}

export interface LineInput {
  qty: number;
  unitPrice: number;
  discount?: number;   // absolute amount already deducted
  taxes: TaxDef[];
  taxInclusive?: boolean;
  decimalPlaces?: number;
}

export interface LineResult {
  subtotal: number;       // qty × unitPrice − discount
  taxableAmount: number;
  taxLines: TaxLineResult[];
  totalTax: number;
  total: number;          // subtotal + totalTax (exclusive) | subtotal (inclusive)
}

function round(n: number, places: number): number {
  const factor = Math.pow(10, places);
  return Math.round(n * factor) / factor;
}

export function computeLineTax(input: LineInput): LineResult {
  const dp = input.decimalPlaces ?? 2;
  const subtotal = round(input.qty * input.unitPrice - (input.discount ?? 0), dp);
  const nonCompoundRateSum = input.taxes
    .filter((t) => !t.isCompound)
    .reduce((s, t) => s + t.rate, 0);

  let taxableAmount: number;
  if (input.taxInclusive) {
    taxableAmount = round(subtotal / (1 + nonCompoundRateSum), dp);
  } else {
    taxableAmount = subtotal;
  }

  const taxLines: TaxLineResult[] = [];
  let priorTaxTotal = 0;

  for (const tax of input.taxes) {
    let taxAmount: number;
    if (tax.isCompound) {
      taxAmount = round((taxableAmount + priorTaxTotal) * tax.rate, dp);
    } else {
      taxAmount = round(taxableAmount * tax.rate, dp);
    }
    taxLines.push({ taxId: tax.id, taxAmount });
    priorTaxTotal += taxAmount;
  }

  const totalTax = taxLines.reduce((s, t) => s + t.taxAmount, 0);

  return {
    subtotal,
    taxableAmount,
    taxLines,
    totalTax: round(totalTax, dp),
    total: input.taxInclusive ? subtotal : round(subtotal + totalTax, dp),
  };
}

/**
 * Aggregate per-line tax results into per-tax totals (for GL posting).
 * Groups by taxId across all lines.
 */
export function aggregateTaxTotals(
  lineResults: LineResult[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of lineResults) {
    for (const tl of line.taxLines) {
      map.set(tl.taxId, (map.get(tl.taxId) ?? 0) + tl.taxAmount);
    }
  }
  return map;
}

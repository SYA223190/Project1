// ─── Permission types ─────────────────────────────────────────────────────────

export type Module =
  | "sales" | "purchases" | "customers" | "vendors" | "items" | "expenses"
  | "banking" | "reports" | "projects" | "timeEntries" | "org" | "users"
  | "roles" | "accountant" | "documents" | "automation";

export type Action = "view" | "create" | "edit" | "delete" | "send" | "approve" | "post" | "void";
export type PermissionKey = `${Module}.${Action}`;
export type Permissions = Partial<Record<PermissionKey, boolean>>;

// ─── GL types ─────────────────────────────────────────────────────────────────

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
export type AccountSubtype =
  | "CASH_AND_BANK" | "ACCOUNTS_RECEIVABLE" | "OTHER_CURRENT_ASSET"
  | "FIXED_ASSET" | "OTHER_ASSET" | "ACCOUNTS_PAYABLE" | "CREDIT_CARD"
  | "OTHER_CURRENT_LIABILITY" | "LONG_TERM_LIABILITY" | "EQUITY"
  | "RETAINED_EARNINGS" | "INCOME" | "OTHER_INCOME" | "COST_OF_GOODS_SOLD"
  | "EXPENSE" | "OTHER_EXPENSE";

export interface JournalLineInput {
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
  currencyCode?: string;
  fxRate?: number;
  order?: number;
}

export interface PostJournalInput {
  organizationId: string;
  date: Date;
  description?: string;
  reference?: string;
  sourceType?: string;
  sourceId?: string;
  currencyCode?: string;
  lines: JournalLineInput[];
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Money helpers ────────────────────────────────────────────────────────────

export function roundMoney(amount: number, decimals = 2): number {
  return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// ─── Audit entity types ───────────────────────────────────────────────────────

export type AuditAction =
  | "create" | "update" | "delete" | "send" | "void" | "post" | "approve" | "reject";

export type AuditEntityType =
  | "invoice" | "bill" | "payment_received" | "payment_made"
  | "credit_note" | "vendor_credit" | "expense" | "journal_entry"
  | "manual_journal" | "bank_transaction" | "item" | "account"
  | "tax" | "customer" | "vendor" | "organization" | "user" | "role";

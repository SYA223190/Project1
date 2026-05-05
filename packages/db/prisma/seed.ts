/**
 * Seed: creates a demo organization with US Chart of Accounts, roles,
 * admin user, sample taxes, and base currency (USD).
 *
 * Run: pnpm --filter=@zoho-clone/db db:seed
 */

import { PrismaClient, AccountType, AccountSubtype } from "../generated/index.js";
import { hash } from "crypto";

const prisma = new PrismaClient();

// ─── US Chart of Accounts ────────────────────────────────────────────────────

const US_COA: Array<{
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  isSystem?: boolean;
  isBankAccount?: boolean;
  parentCode?: string;
}> = [
  // ── Assets ──
  { code: "1000", name: "Cash and Cash Equivalents", type: "ASSET", subtype: "CASH_AND_BANK", isSystem: true },
  { code: "1010", name: "Checking Account", type: "ASSET", subtype: "CASH_AND_BANK", isBankAccount: true, parentCode: "1000" },
  { code: "1020", name: "Savings Account", type: "ASSET", subtype: "CASH_AND_BANK", isBankAccount: true, parentCode: "1000" },
  { code: "1100", name: "Accounts Receivable", type: "ASSET", subtype: "ACCOUNTS_RECEIVABLE", isSystem: true },
  { code: "1200", name: "Other Current Assets", type: "ASSET", subtype: "OTHER_CURRENT_ASSET" },
  { code: "1210", name: "Prepaid Expenses", type: "ASSET", subtype: "OTHER_CURRENT_ASSET", parentCode: "1200" },
  { code: "1220", name: "Inventory Asset", type: "ASSET", subtype: "OTHER_CURRENT_ASSET" },
  { code: "1300", name: "Fixed Assets", type: "ASSET", subtype: "FIXED_ASSET" },
  { code: "1310", name: "Equipment", type: "ASSET", subtype: "FIXED_ASSET", parentCode: "1300" },
  { code: "1320", name: "Accumulated Depreciation", type: "ASSET", subtype: "FIXED_ASSET", parentCode: "1300" },
  { code: "1400", name: "Other Assets", type: "ASSET", subtype: "OTHER_ASSET" },

  // ── Liabilities ──
  { code: "2000", name: "Current Liabilities", type: "LIABILITY", subtype: "OTHER_CURRENT_LIABILITY" },
  { code: "2100", name: "Accounts Payable", type: "LIABILITY", subtype: "ACCOUNTS_PAYABLE", isSystem: true },
  { code: "2200", name: "Credit Cards", type: "LIABILITY", subtype: "CREDIT_CARD" },
  { code: "2210", name: "Business Credit Card", type: "LIABILITY", subtype: "CREDIT_CARD", isBankAccount: true, parentCode: "2200" },
  { code: "2300", name: "Sales Tax Payable", type: "LIABILITY", subtype: "OTHER_CURRENT_LIABILITY", isSystem: true },
  { code: "2310", name: "Federal Income Tax Payable", type: "LIABILITY", subtype: "OTHER_CURRENT_LIABILITY", parentCode: "2300" },
  { code: "2320", name: "State Income Tax Payable", type: "LIABILITY", subtype: "OTHER_CURRENT_LIABILITY", parentCode: "2300" },
  { code: "2400", name: "Accrued Liabilities", type: "LIABILITY", subtype: "OTHER_CURRENT_LIABILITY" },
  { code: "2410", name: "Accrued Payroll", type: "LIABILITY", subtype: "OTHER_CURRENT_LIABILITY", parentCode: "2400" },
  { code: "2500", name: "Deferred Revenue", type: "LIABILITY", subtype: "OTHER_CURRENT_LIABILITY" },
  { code: "2600", name: "Long-Term Liabilities", type: "LIABILITY", subtype: "LONG_TERM_LIABILITY" },
  { code: "2610", name: "Bank Loan", type: "LIABILITY", subtype: "LONG_TERM_LIABILITY", parentCode: "2600" },

  // ── Equity ──
  { code: "3000", name: "Owner's Equity", type: "EQUITY", subtype: "EQUITY", isSystem: true },
  { code: "3100", name: "Common Stock", type: "EQUITY", subtype: "EQUITY", parentCode: "3000" },
  { code: "3200", name: "Additional Paid-in Capital", type: "EQUITY", subtype: "EQUITY", parentCode: "3000" },
  { code: "3300", name: "Retained Earnings", type: "EQUITY", subtype: "RETAINED_EARNINGS", isSystem: true },
  { code: "3400", name: "Owner's Draw", type: "EQUITY", subtype: "EQUITY" },

  // ── Income ──
  { code: "4000", name: "Revenue", type: "INCOME", subtype: "INCOME" },
  { code: "4100", name: "Sales Revenue", type: "INCOME", subtype: "INCOME", isSystem: true, parentCode: "4000" },
  { code: "4200", name: "Service Revenue", type: "INCOME", subtype: "INCOME", parentCode: "4000" },
  { code: "4300", name: "Other Income", type: "INCOME", subtype: "OTHER_INCOME" },
  { code: "4310", name: "Interest Income", type: "INCOME", subtype: "OTHER_INCOME", parentCode: "4300" },
  { code: "4320", name: "Realized FX Gain", type: "INCOME", subtype: "OTHER_INCOME", isSystem: true },
  { code: "4330", name: "Unrealized FX Gain", type: "INCOME", subtype: "OTHER_INCOME", isSystem: true },

  // ── Cost of Goods Sold ──
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", subtype: "COST_OF_GOODS_SOLD", isSystem: true },
  { code: "5100", name: "Cost of Goods Sold - Products", type: "EXPENSE", subtype: "COST_OF_GOODS_SOLD", parentCode: "5000" },

  // ── Operating Expenses ──
  { code: "6000", name: "Operating Expenses", type: "EXPENSE", subtype: "EXPENSE" },
  { code: "6100", name: "Salaries and Wages", type: "EXPENSE", subtype: "EXPENSE", parentCode: "6000" },
  { code: "6200", name: "Rent Expense", type: "EXPENSE", subtype: "EXPENSE", parentCode: "6000" },
  { code: "6300", name: "Utilities", type: "EXPENSE", subtype: "EXPENSE", parentCode: "6000" },
  { code: "6400", name: "Advertising and Marketing", type: "EXPENSE", subtype: "EXPENSE", parentCode: "6000" },
  { code: "6500", name: "Office Supplies", type: "EXPENSE", subtype: "EXPENSE", parentCode: "6000" },
  { code: "6600", name: "Professional Services", type: "EXPENSE", subtype: "EXPENSE", parentCode: "6000" },
  { code: "6700", name: "Insurance", type: "EXPENSE", subtype: "EXPENSE", parentCode: "6000" },
  { code: "6800", name: "Depreciation Expense", type: "EXPENSE", subtype: "EXPENSE", parentCode: "6000" },
  { code: "6900", name: "Travel and Entertainment", type: "EXPENSE", subtype: "EXPENSE", parentCode: "6000" },
  { code: "7000", name: "Other Expenses", type: "EXPENSE", subtype: "OTHER_EXPENSE" },
  { code: "7100", name: "Bank Charges", type: "EXPENSE", subtype: "OTHER_EXPENSE", parentCode: "7000" },
  { code: "7200", name: "Realized FX Loss", type: "EXPENSE", subtype: "OTHER_EXPENSE", isSystem: true },
  { code: "7300", name: "Unrealized FX Loss", type: "EXPENSE", subtype: "OTHER_EXPENSE", isSystem: true },
];

// ─── Default Roles ────────────────────────────────────────────────────────────

const MODULES = [
  "sales", "purchases", "customers", "vendors", "items", "expenses",
  "banking", "reports", "projects", "timeEntries", "org", "users", "roles",
  "accountant", "documents", "automation",
];
const ACTIONS = ["view", "create", "edit", "delete", "send", "approve", "post", "void"];

function buildPermissions(rules: Record<string, string[]>): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  if (rules["*"]) {
    for (const mod of MODULES) {
      for (const action of ACTIONS) {
        perms[`${mod}.${action}`] = true;
      }
    }
    return perms;
  }
  for (const [mod, actions] of Object.entries(rules)) {
    for (const action of actions) {
      perms[`${mod}.${action}`] = true;
    }
  }
  return perms;
}

const ROLES = [
  {
    name: "Admin",
    description: "Full access to everything",
    isSystem: true,
    permissions: buildPermissions({ "*": ACTIONS }),
  },
  {
    name: "Staff",
    description: "Sales, purchases, customers, vendors, items and expenses",
    isSystem: true,
    permissions: buildPermissions({
      sales: ["view", "create", "edit", "send"],
      purchases: ["view", "create", "edit"],
      customers: ["view", "create", "edit"],
      vendors: ["view", "create", "edit"],
      items: ["view", "create", "edit"],
      expenses: ["view", "create", "edit"],
      banking: ["view", "create"],
      reports: ["view"],
    }),
  },
  {
    name: "Accountant",
    description: "Everything except org management and user/role admin",
    isSystem: true,
    permissions: buildPermissions({
      sales: ACTIONS,
      purchases: ACTIONS,
      customers: ACTIONS,
      vendors: ACTIONS,
      items: ACTIONS,
      expenses: ACTIONS,
      banking: ACTIONS,
      reports: ACTIONS,
      projects: ACTIONS,
      timeEntries: ACTIONS,
      accountant: ACTIONS,
      documents: ACTIONS,
    }),
  },
  {
    name: "TimesheetUser",
    description: "View assigned projects and log own time",
    isSystem: true,
    permissions: buildPermissions({
      projects: ["view"],
      timeEntries: ["view", "create", "edit", "submit"],
    }),
  },
];

// ─── Main seed function ───────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...");

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Admin User",
      passwordHash: hash("sha256", "admin123"),
      emailVerified: new Date(),
    },
  });
  console.log(`✓ Admin user: ${adminUser.email}`);

  // Demo organization
  const org = await prisma.organization.upsert({
    where: { slug: "demo-company" },
    update: {},
    create: {
      name: "Demo Company LLC",
      slug: "demo-company",
      baseCurrency: "USD",
      country: "US",
      fiscalYearStart: 1,
      decimalPlaces: 2,
      timezone: "America/New_York",
      address: {
        line1: "123 Main Street",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "US",
      },
      phone: "+1-555-0100",
      website: "https://demo.example.com",
    },
  });
  console.log(`✓ Organization: ${org.name}`);

  // Seed roles
  const roleMap: Record<string, string> = {};
  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { organizationId_name: { organizationId: org.id, name: roleDef.name } },
      update: { permissions: roleDef.permissions },
      create: {
        organizationId: org.id,
        name: roleDef.name,
        description: roleDef.description,
        permissions: roleDef.permissions,
        isSystem: roleDef.isSystem,
      },
    });
    roleMap[roleDef.name] = role.id;
    console.log(`✓ Role: ${role.name}`);
  }

  // Add admin as owner
  const adminRoleId = roleMap["Admin"];
  if (!adminRoleId) throw new Error("Admin role not found");
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: adminUser.id } },
    update: {},
    create: {
      organizationId: org.id,
      userId: adminUser.id,
      roleId: adminRoleId,
      isOwner: true,
      joinedAt: new Date(),
    },
  });
  console.log(`✓ Admin member linked`);

  // Seed USD currency rate (base = 1.0)
  await prisma.currencyRate.upsert({
    where: {
      organizationId_currencyCode_date: {
        organizationId: org.id,
        currencyCode: "USD",
        date: new Date("2024-01-01"),
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      currencyCode: "USD",
      date: new Date("2024-01-01"),
      rateToBase: 1.0,
      source: "system",
    },
  });
  console.log(`✓ USD currency rate seeded`);

  // Seed US Chart of Accounts
  const codeToId: Record<string, string> = {};

  // Pass 1: create all accounts without parents
  for (const acct of US_COA) {
    if (acct.parentCode) continue;
    const created = await prisma.account.upsert({
      where: { organizationId_code: { organizationId: org.id, code: acct.code } },
      update: {},
      create: {
        organizationId: org.id,
        code: acct.code,
        name: acct.name,
        type: acct.type,
        subtype: acct.subtype,
        isSystem: acct.isSystem ?? false,
        isBankAccount: acct.isBankAccount ?? false,
      },
    });
    codeToId[acct.code] = created.id;
  }

  // Pass 2: create child accounts
  for (const acct of US_COA) {
    if (!acct.parentCode) continue;
    const parentId = codeToId[acct.parentCode];
    const created = await prisma.account.upsert({
      where: { organizationId_code: { organizationId: org.id, code: acct.code } },
      update: {},
      create: {
        organizationId: org.id,
        parentId,
        code: acct.code,
        name: acct.name,
        type: acct.type,
        subtype: acct.subtype,
        isSystem: acct.isSystem ?? false,
        isBankAccount: acct.isBankAccount ?? false,
      },
    });
    codeToId[acct.code] = created.id;
  }
  console.log(`✓ Chart of Accounts seeded (${US_COA.length} accounts)`);

  // Seed common US taxes
  const salesTaxPayableId = codeToId["2300"];
  const taxes = [
    { code: "EXEMPT", name: "Tax Exempt", rate: 0, payableAccountId: salesTaxPayableId },
    { code: "US_SALES_8", name: "US Sales Tax 8%", rate: 0.08, payableAccountId: salesTaxPayableId },
    { code: "US_SALES_10", name: "US Sales Tax 10%", rate: 0.10, payableAccountId: salesTaxPayableId },
  ];
  for (const taxDef of taxes) {
    await prisma.tax.upsert({
      where: { organizationId_code: { organizationId: org.id, code: taxDef.code } },
      update: {},
      create: {
        organizationId: org.id,
        code: taxDef.code,
        name: taxDef.name,
        rate: taxDef.rate,
        payableAccountId: taxDef.payableAccountId ?? null,
        isActive: true,
      },
    });
  }
  console.log(`✓ Taxes seeded (${taxes.length})`);

  // Seed number series
  const seriesDefs = [
    { module: "invoice", prefix: "INV-" },
    { module: "quote", prefix: "QTE-" },
    { module: "sales_order", prefix: "SO-" },
    { module: "delivery_note", prefix: "DN-" },
    { module: "credit_note", prefix: "CN-" },
    { module: "payment_received", prefix: "PR-" },
    { module: "purchase_order", prefix: "PO-" },
    { module: "bill", prefix: "BILL-" },
    { module: "vendor_credit", prefix: "VC-" },
    { module: "payment_made", prefix: "PM-" },
    { module: "expense", prefix: "EXP-" },
    { module: "journal", prefix: "JNL-" },
    { module: "manual_journal", prefix: "MJ-" },
  ];
  for (const s of seriesDefs) {
    await prisma.numberSeries.upsert({
      where: { organizationId_module: { organizationId: org.id, module: s.module } },
      update: {},
      create: {
        organizationId: org.id,
        module: s.module,
        prefix: s.prefix,
        nextNumber: 1,
        padLength: 5,
      },
    });
  }
  console.log(`✓ Number series seeded (${seriesDefs.length})`);

  // Seed demo customer
  await prisma.customer.upsert({
    where: { id: "demo-customer-001" },
    update: {},
    create: {
      id: "demo-customer-001",
      organizationId: org.id,
      displayName: "Acme Corporation",
      companyName: "Acme Corp",
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@acme.example.com",
      phone: "+1-555-0200",
      currencyCode: "USD",
      paymentTerms: 30,
      billingAddress: {
        line1: "456 Commerce Ave",
        city: "Los Angeles",
        state: "CA",
        zip: "90001",
        country: "US",
      },
    },
  });
  console.log(`✓ Demo customer seeded`);

  console.log("\n✅ Seed complete!");
  console.log("   Login: admin@demo.com / admin123");
  console.log("   Org:   demo-company");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

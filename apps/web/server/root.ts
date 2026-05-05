import { router } from "./trpc.js";
import { authRouter } from "./routers/auth.js";
import { orgRouter } from "./routers/org.js";
import { rolesRouter } from "./routers/roles.js";
import { accountsRouter } from "./routers/accounts.js";
import { taxesRouter } from "./routers/taxes.js";
import { currenciesRouter } from "./routers/currencies.js";
import { manualJournalsRouter } from "./routers/manualJournals.js";
import { auditLogRouter } from "./routers/auditLog.js";

export const appRouter = router({
  auth: authRouter,
  org: orgRouter,
  roles: rolesRouter,
  accounts: accountsRouter,
  taxes: taxesRouter,
  currencies: currenciesRouter,
  manualJournals: manualJournalsRouter,
  auditLog: auditLogRouter,
});

export type AppRouter = typeof appRouter;

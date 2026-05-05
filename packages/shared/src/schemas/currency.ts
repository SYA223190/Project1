import { z } from "zod";

export const upsertCurrencyRateSchema = z.object({
  currencyCode: z.string().length(3),
  date: z.coerce.date(),
  rateToBase: z.number().positive("Rate must be positive"),
});

export const fetchTodayRatesSchema = z.object({
  currencies: z.array(z.string().length(3)).min(1),
});

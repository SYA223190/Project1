/**
 * Number Series Service
 *
 * Atomically increments the series counter and returns the formatted number.
 * Always called inside a DB transaction to prevent gaps under concurrency.
 */

import type { PrismaClient } from "@zoho-clone/db/client";

export class NumberingService {
  constructor(private readonly db: PrismaClient) {}

  async next(
    organizationId: string,
    module: string,
    tx?: PrismaClient
  ): Promise<string> {
    const client = tx ?? this.db;
    const series = await client.numberSeries.update({
      where: { organizationId_module: { organizationId, module } },
      data: { nextNumber: { increment: 1 } },
    });
    const num = (series.nextNumber - 1).toString().padStart(series.padLength, "0");
    return `${series.prefix}${num}`;
  }

  async peek(organizationId: string, module: string): Promise<string> {
    const series = await this.db.numberSeries.findUniqueOrThrow({
      where: { organizationId_module: { organizationId, module } },
    });
    const num = series.nextNumber.toString().padStart(series.padLength, "0");
    return `${series.prefix}${num}`;
  }
}

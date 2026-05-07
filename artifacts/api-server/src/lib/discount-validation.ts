import { and, eq, count } from "drizzle-orm";
import {
  db,
  discountCodesTable,
  discountCodeUsagesTable,
  paymentsTable,
  usersTable,
  type DiscountCode,
} from "@workspace/db";

type ValidateResult =
  | {
      kind: "ok";
      discount: DiscountCode;
      discountCodeId: string;
      discountedAmountMinor: number;
    }
  | { kind: "error"; reason: string };

export async function validateDiscountCode(
  code: string,
  userId: string,
  course: string,
  tier: string,
  items?: { course: string; tier: string }[],
  amountMinor?: number,
): Promise<ValidateResult> {
  const upperCode = code.trim().toUpperCase();
  if (!upperCode) return { kind: "error", reason: "missing_code" };

  const [discount] = await db
    .select()
    .from(discountCodesTable)
    .where(eq(discountCodesTable.code, upperCode))
    .limit(1);

  if (!discount) return { kind: "error", reason: "invalid_code" };
  if (discount.status !== "active")
    return { kind: "error", reason: "inactive_code" };

  const now = new Date();
  if (now < discount.startDate) return { kind: "error", reason: "not_started" };
  if (!discount.neverExpires && discount.endDate && now > discount.endDate) {
    return { kind: "error", reason: "expired" };
  }

  if (discount.totalUsageLimit !== null) {
    const [{ value: totalUsed }] = await db
      .select({ value: count() })
      .from(discountCodeUsagesTable)
      .where(eq(discountCodeUsagesTable.discountCodeId, discount.id));
    if (totalUsed >= discount.totalUsageLimit) {
      return { kind: "error", reason: "usage_limit_reached" };
    }
  }

  if (discount.oneTimePerUser || discount.perUserLimit > 0) {
    const [{ value: userUsed }] = await db
      .select({ value: count() })
      .from(discountCodeUsagesTable)
      .where(
        and(
          eq(discountCodeUsagesTable.discountCodeId, discount.id),
          eq(discountCodeUsagesTable.userId, userId),
        ),
      );
    const limit = discount.oneTimePerUser ? 1 : discount.perUserLimit;
    if (userUsed >= limit) {
      return { kind: "error", reason: "already_used" };
    }
  }

  if (discount.scope === "specific") {
    if (items && items.length > 0) {
      const eligible = items.some((item) => {
        const courseMatch =
          !discount.specificCourse || discount.specificCourse === item.course;
        const tierMatch =
          !discount.specificTier || discount.specificTier === item.tier;
        return courseMatch && tierMatch;
      });
      if (!eligible) {
        return { kind: "error", reason: "not_applicable" };
      }
    } else if (course) {
      const courseMatch =
        !discount.specificCourse || discount.specificCourse === course;
      const tierMatch =
        !discount.specificTier || discount.specificTier === tier;
      if (!courseMatch || !tierMatch) {
        return { kind: "error", reason: "not_applicable" };
      }
    }
  }

  if (discount.firstPurchaseOnly) {
    const [{ value: prevPayments }] = await db
      .select({ value: count() })
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.userId, userId),
          eq(paymentsTable.status, "captured"),
        ),
      );
    if (prevPayments > 0) {
      return { kind: "error", reason: "first_purchase_only" };
    }
  }

  if (discount.newUsersOnly) {
    const [user] = await db
      .select({ createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (user) {
      const daysSinceCreation =
        (Date.now() - new Date(user.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 30) {
        return { kind: "error", reason: "new_users_only" };
      }
    }
  }

  let discountedAmountMinor = 0;
  if (amountMinor !== undefined) {
    let discountMinor: number;
    if (discount.discountType === "percentage") {
      discountMinor = Math.round(
        (amountMinor * discount.discountValue) / 100,
      );
    } else {
      discountMinor = Math.min(discount.discountValue * 100, amountMinor);
    }
    discountedAmountMinor = Math.max(0, amountMinor - discountMinor);
  }

  return {
    kind: "ok",
    discount,
    discountCodeId: discount.id,
    discountedAmountMinor,
  };
}

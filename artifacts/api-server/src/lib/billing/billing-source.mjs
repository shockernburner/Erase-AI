// Pure billing/checkout logic extracted out of routes/billing.ts so the
// subscription checkout flow can be exercised by `node --test` without
// booting Express, Postgres, or talking to live Stripe.
//
// The route imports these helpers verbatim, so the regression tests under
// tests/billing-checkout.test.mjs pin the exact behaviour that ships:
//   * which plans are checkoutable + their pricing,
//   * how a /checkout request body is validated,
//   * the precise Stripe Checkout Session params we send,
//   * how a returned Checkout Session is turned into a plan promotion by
//     /checkout-status.

export const ANNUAL_DISCOUNT = 0.9;

export function annualPrice(monthly) {
  return Math.round(monthly * 12 * ANNUAL_DISCOUNT);
}

// Team ("business") is priced per person, paid by the organization: $9 a
// person a month, or $8 a person a month billed yearly ($96), for 3 to 10
// people. Must match the website (eraseai src/lib/pricingPlans.ts).
export const PLAN_PRICING = {
  personal: { monthly: 5, annual: annualPrice(5), currency: "USD" },
  pro: { monthly: 19, annual: annualPrice(19), currency: "USD" },
  business: { monthly: 9, annual: 96, currency: "USD", perSeat: true, minSeats: 3, maxSeats: 10 },
};

// Plans anyone can buy for themselves through self-serve Stripe checkout.
// `free` needs no checkout and `enterprise` is sales-assisted (contact us for
// pricing). Team is sold through sales too until organization billing exists
// (seats paid by the organization, members joining it): a self-serve Team
// purchase today would be one account that cannot add its people.
export const VALID_CHECKOUT_PLANS = ["personal", "pro"];

// Plans a completed Checkout Session may promote a user to. Includes Team so
// a Team session started before Team moved to sales still lands on Team
// instead of falling back to Developer.
export const PROMOTABLE_PLANS = ["personal", "pro", "business"];

export function isValidBillingPeriod(value) {
  return value === "monthly" || value === "annual";
}

export function isValidCheckoutPlan(value) {
  return typeof value === "string" && VALID_CHECKOUT_PLANS.includes(value);
}

// Advance `start` by one billing interval, clamping the day-of-month so
// e.g. a Jan-31 monthly renewal lands on the last day of February rather
// than rolling over into March.
export function extendEndDate(start, period) {
  const monthsToAdd = period === "annual" ? 12 : 1;
  const originalDay = start.getDate();
  const target = new Date(start);
  target.setDate(1);
  target.setMonth(target.getMonth() + monthsToAdd);
  const lastDayOfTargetMonth = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  target.setHours(
    start.getHours(),
    start.getMinutes(),
    start.getSeconds(),
    start.getMilliseconds(),
  );
  return target;
}

// Validate the POST /checkout request body. Returns either a normalised
// { ok: true, plan, period } or { ok: false, status, error } mirroring the
// HTTP responses the route sends.
export function validateCheckoutRequest({ plan, billingPeriod, returnUrl } = {}) {
  if (!isValidCheckoutPlan(plan)) {
    return { ok: false, status: 400, error: "Invalid or non-checkoutable plan" };
  }
  const period = isValidBillingPeriod(billingPeriod) ? billingPeriod : "monthly";
  if (typeof returnUrl !== "string" || !/^https?:\/\//.test(returnUrl)) {
    return { ok: false, status: 400, error: "Missing or invalid returnUrl" };
  }
  return { ok: true, plan, period };
}

// Build the exact params object passed to stripe.checkout.sessions.create.
// Subscription mode, the resolved price, and metadata on both the session
// and the resulting subscription so /checkout-status (and the webhook sync)
// can recover which user/plan/period a payment belongs to.
export function buildCheckoutSessionParams({
  priceId,
  customerId,
  returnUrl,
  userId,
  plan,
  period,
}) {
  const sep = returnUrl.includes("?") ? "&" : "?";
  return {
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}${sep}checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}${sep}checkout=cancel`,
    allow_promotion_codes: true,
    metadata: { user_id: userId, plan, billing_period: period },
    subscription_data: {
      metadata: { user_id: userId, plan, billing_period: period },
    },
  };
}

// Map a Checkout Session's metadata.plan back to the plan we'll store. Only
// the three checkoutable plans are honoured; anything else falls back to
// "pro" (matching the route's historical default).
export function resolveTargetPlan(rawPlan) {
  return typeof rawPlan === "string" && PROMOTABLE_PLANS.includes(rawPlan) ? rawPlan : "pro";
}

// Decide what /checkout-status should do with a retrieved Checkout Session.
// `now` is injectable so the period-end fallback is deterministic in tests.
//
// Returns one of:
//   { kind: "denied" }                         — session belongs to another user
//   { kind: "succeeded", plan, period,
//     subscriptionId, customerId, endDate }    — promote the user
//   { kind: "expired" }
//   { kind: "pending" }
export function evaluateCheckoutStatus(session, expectedUserId, now = new Date()) {
  if (session?.metadata?.user_id !== expectedUserId) {
    return { kind: "denied" };
  }

  const plan = resolveTargetPlan(session.metadata?.plan);
  const rawPeriod = session.metadata?.billing_period;
  const period = isValidBillingPeriod(rawPeriod) ? rawPeriod : "monthly";

  const paid =
    session.status === "complete" &&
    (session.payment_status === "paid" ||
      session.payment_status === "no_payment_required");

  if (paid) {
    const sub = session.subscription;
    let subscriptionId = null;
    let periodEnd = null;
    if (typeof sub === "string") {
      subscriptionId = sub;
    } else if (sub) {
      subscriptionId = sub.id;
      if (typeof sub.current_period_end === "number") {
        periodEnd = new Date(sub.current_period_end * 1000);
      }
    }

    const endDate = periodEnd ?? extendEndDate(now, period);
    const customerId =
      typeof session.customer === "string" ? session.customer : null;

    return {
      kind: "succeeded",
      plan,
      period,
      subscriptionId,
      customerId,
      endDate,
    };
  }

  if (session.status === "expired") {
    return { kind: "expired" };
  }

  return { kind: "pending" };
}

// Self-serve Team billing rules.
//
// A Team is one Stripe subscription per organization, on the per-person
// "business" price with quantity = seats (3 to 10). Buying one creates the
// organization with the buyer as owner; Stripe webhooks then keep its seats
// and status in step. Pure helpers live here so `node --test` can cover them;
// routes/team-billing.ts and lib/billing/team.ts use the same functions.
//
// Team subscriptions carry `metadata.kind = "team"` and `owner_user_id`, and
// deliberately no `user_id`, so the per-user reconcile (reconcile-source.mjs)
// never mistakes one for a personal plan.

import { PLAN_PRICING, isValidBillingPeriod } from "./billing-source.mjs";

export const TEAM_MIN_SEATS = PLAN_PRICING.business.minSeats;
export const TEAM_MAX_SEATS = PLAN_PRICING.business.maxSeats;
export const TEAM_KIND = "team";

// Price per seat in cents for each billing period; checkout only accepts a
// Stripe price with exactly this amount, so an old flat Team price is never
// used by mistake.
export const TEAM_SEAT_CENTS = {
  monthly: PLAN_PRICING.business.monthly * 100,
  annual: PLAN_PRICING.business.annual * 100,
};

export function isValidSeatCount(n) {
  return Number.isInteger(n) && n >= TEAM_MIN_SEATS && n <= TEAM_MAX_SEATS;
}

export function validateTeamCheckout({ orgName, seats, billingPeriod, returnUrl } = {}) {
  const name = typeof orgName === "string" ? orgName.trim() : "";
  if (!name) return { ok: false, status: 400, error: "Organization name is required" };
  if (name.length > 120) return { ok: false, status: 400, error: "Organization name must be at most 120 characters" };
  if (!isValidSeatCount(seats)) {
    return { ok: false, status: 400, error: `Teams/Family is for ${TEAM_MIN_SEATS} to ${TEAM_MAX_SEATS} people. Contact us for more.` };
  }
  if (typeof returnUrl !== "string" || !/^https?:\/\//.test(returnUrl)) {
    return { ok: false, status: 400, error: "Missing or invalid returnUrl" };
  }
  const period = isValidBillingPeriod(billingPeriod) ? billingPeriod : "monthly";
  return { ok: true, value: { name, seats, period } };
}

export function teamTotalCents(seats, period) {
  return seats * TEAM_SEAT_CENTS[period];
}

export function buildTeamCheckoutParams({ priceId, customerId, returnUrl, userId, orgName, seats, period }) {
  const sep = returnUrl.includes("?") ? "&" : "?";
  const metadata = {
    kind: TEAM_KIND,
    owner_user_id: userId,
    org_name: orgName,
    seats: String(seats),
    plan: "business",
    billing_period: period,
  };
  return {
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: seats }],
    success_url: `${returnUrl}${sep}checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}${sep}checkout=cancel`,
    allow_promotion_codes: true,
    // A 100%-off code makes the total $0; then Stripe doesn't ask for a card.
    payment_method_collection: "if_required",
    metadata,
    subscription_data: { metadata },
  };
}

// Stripe subscription status -> organization status. `null` means "not
// paid for yet": don't create an organization for it.
export function orgStatusForSubscription(status) {
  if (status === "active" || status === "trialing" || status === "past_due") return "active";
  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") return "suspended";
  return null;
}

function toPeriodEndMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value * 1000;
  return null;
}

// Seats and renewal date from a Stripe subscription object (or the synced
// raw_data). Newer Stripe API versions keep current_period_end on the item.
export function readSubscriptionSeats(sub) {
  const item = sub?.items?.data?.[0];
  const quantity = Number(item?.quantity);
  return {
    seats: Number.isInteger(quantity) && quantity > 0 ? quantity : null,
    itemId: typeof item?.id === "string" ? item.id : null,
    periodEndMs: toPeriodEndMs(sub?.current_period_end) ?? toPeriodEndMs(item?.current_period_end),
  };
}

// What /checkout-status does with a retrieved Team Checkout Session
// (expanded with its subscription).
export function evaluateTeamCheckout(session, expectedUserId) {
  const md = session?.metadata ?? {};
  if (md.kind !== TEAM_KIND || md.owner_user_id !== expectedUserId) return { kind: "denied" };
  const paid =
    session.status === "complete" &&
    (session.payment_status === "paid" || session.payment_status === "no_payment_required");
  if (!paid) return { kind: session.status === "expired" ? "expired" : "pending" };
  const sub = session.subscription;
  const subscriptionId = typeof sub === "string" ? sub : sub?.id ?? null;
  if (!subscriptionId) return { kind: "pending" };
  const fromSub = sub && typeof sub === "object" ? readSubscriptionSeats(sub) : { seats: null, periodEndMs: null };
  const metaSeats = Number(md.seats);
  return {
    kind: "succeeded",
    subscriptionId,
    customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    name: typeof md.org_name === "string" && md.org_name.trim() ? md.org_name.trim().slice(0, 120) : "My team",
    seats: fromSub.seats ?? (Number.isInteger(metaSeats) ? metaSeats : TEAM_MIN_SEATS),
    period: isValidBillingPeriod(md.billing_period) ? md.billing_period : "monthly",
    subscriptionStatus: sub && typeof sub === "object" && typeof sub.status === "string" ? sub.status : "active",
    periodEndMs: fromSub.periodEndMs,
  };
}

// Webhook reconcile for one synced Team subscription row
// ({ id, status, quantity, owner_user_id, org_name, billing_period,
// current_period_end_ms }) against the organization already linked to it
// (or null). Returns { action: "none" | "create" | "update", ... }.
export function decideTeamReconcile(row, existingOrg) {
  if (!row || !row.id) return { action: "none" };
  const orgStatus = orgStatusForSubscription(row.status);
  const seats = Number.isInteger(row.quantity) && row.quantity > 0 ? row.quantity : null;
  const fields = { subscriptionStatus: row.status };
  if (orgStatus) fields.status = orgStatus;
  if (seats) fields.seatLimit = seats;
  if (typeof row.current_period_end_ms === "number") fields.currentPeriodEndMs = row.current_period_end_ms;
  if (existingOrg) return { action: "update", fields };
  if (orgStatus !== "active" || !row.owner_user_id) return { action: "none" };
  return {
    action: "create",
    ownerUserId: row.owner_user_id,
    name: typeof row.org_name === "string" && row.org_name.trim() ? row.org_name.trim().slice(0, 120) : "My team",
    period: isValidBillingPeriod(row.billing_period) ? row.billing_period : "monthly",
    fields: { ...fields, seatLimit: seats ?? TEAM_MIN_SEATS },
  };
}

// Owners change the number of paid seats; never below the people already
// taking a seat (active members plus pending invites).
export function validateSeatChange({ seats, seatsUsed }) {
  if (!isValidSeatCount(seats)) {
    return { ok: false, status: 400, error: `Teams/Family is for ${TEAM_MIN_SEATS} to ${TEAM_MAX_SEATS} people. Contact us for more.` };
  }
  if (seats < seatsUsed) {
    return {
      ok: false,
      status: 409,
      error: `${seatsUsed} seats are in use (people and pending invites). Remove someone before going down to ${seats}.`,
    };
  }
  return { ok: true };
}

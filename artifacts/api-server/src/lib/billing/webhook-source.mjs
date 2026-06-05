// Stripe webhook request handling extracted out of app.ts so the
// raw-body + signature handling can be exercised by `node --test` with a
// fake StripeSync, without booting the full app or hitting the network.
//
// app.ts wires this factory into the route registered BEFORE express.json()
// (signature verification needs the untouched raw Buffer). `getSync` is
// injected so production passes the real StripeSync singleton and tests pass
// a fake that verifies the signature against a known test secret.
export function createStripeWebhookHandler({ getSync, reconcile, logger = console } = {}) {
  if (typeof getSync !== "function") {
    throw new TypeError(
      "createStripeWebhookHandler requires getSync() -> Promise<StripeSync>",
    );
  }

  return async function stripeWebhookHandler(req, res) {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    if (!Buffer.isBuffer(req.body)) {
      logger.error("Stripe webhook body is not a Buffer — express.json() ran first");
      res.status(500).json({ error: "Webhook processing error" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      const sync = await getSync();
      await sync.processWebhook(req.body, sig);
      // The sync above only refreshes the `stripe.*` mirror tables. Map those
      // subscription lifecycle changes back onto our users. A reconcile failure
      // must not 400 the webhook (the sync already succeeded, and a 400 would
      // make Stripe retry needlessly) — log it and let the next event catch up.
      if (typeof reconcile === "function") {
        try {
          await reconcile();
        } catch (err) {
          logger.error({ err }, "Post-webhook subscription reconcile failed");
        }
      }
      res.status(200).json({ received: true });
    } catch (err) {
      logger.error({ err }, "Stripe webhook processing failed");
      res.status(400).json({ error: "Webhook processing error" });
    }
  };
}

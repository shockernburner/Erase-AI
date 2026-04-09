const AIRWALLEX_API_KEY = process.env.AIRWALLEX_API_KEY || "";
const AIRWALLEX_CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID || "";
const AIRWALLEX_ENV = process.env.AIRWALLEX_ENV || "demo";

const API_BASE =
  AIRWALLEX_ENV === "production"
    ? "https://api.airwallex.com"
    : "https://api-demo.airwallex.com";

const CHECKOUT_BASE =
  AIRWALLEX_ENV === "production"
    ? "https://checkout.airwallex.com"
    : "https://checkout-demo.airwallex.com";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const res = await fetch(`${API_BASE}/api/v1/authentication/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": AIRWALLEX_CLIENT_ID,
      "x-api-key": AIRWALLEX_API_KEY,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airwallex auth failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { token: string; expires_at: string };
  cachedToken = data.token;
  tokenExpiresAt = new Date(data.expires_at).getTime();
  return cachedToken;
}

async function airwallexRequest<T = unknown>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Airwallex API error (${res.status} ${path}): ${errBody}`);
  }

  return res.json() as Promise<T>;
}

interface PaymentIntentResponse {
  id: string;
  client_secret: string;
  status: string;
  request_id: string;
  amount: number;
  currency: string;
  merchant_order_id: string;
  metadata: Record<string, string>;
}

export async function createCheckoutSession(params: {
  amount: number;
  currency: string;
  userId: string;
  merchantOrderId: string;
  returnUrl: string;
  plan?: string;
}): Promise<{ intentId: string; clientSecret: string; checkoutUrl: string }> {
  const planLabel = params.plan || "pro";

  const intent = await airwallexRequest<PaymentIntentResponse>(
    "POST",
    "/api/v1/pa/payment_intents/create",
    {
      amount: params.amount,
      currency: params.currency,
      merchant_order_id: params.merchantOrderId,
      metadata: {
        user_id: params.userId,
        plan: planLabel,
      },
      request_id: params.merchantOrderId,
      return_url: params.returnUrl,
    },
  );

  const successUrl = encodeURIComponent(params.returnUrl);
  const checkoutUrl =
    `${CHECKOUT_BASE}/hpp?intent_id=${encodeURIComponent(intent.id)}` +
    `&client_secret=${encodeURIComponent(intent.client_secret)}` +
    `&mode=payment` +
    `&currency=${encodeURIComponent(params.currency)}` +
    `&successUrl=${successUrl}` +
    `&failUrl=${successUrl}`;

  return {
    intentId: intent.id,
    clientSecret: intent.client_secret,
    checkoutUrl,
  };
}

export async function getPaymentIntent(
  intentId: string,
): Promise<PaymentIntentResponse> {
  return airwallexRequest<PaymentIntentResponse>(
    "GET",
    `/api/v1/pa/payment_intents/${intentId}`,
  );
}

export function isConfigured(): boolean {
  return !!(AIRWALLEX_API_KEY && AIRWALLEX_CLIENT_ID);
}

export function getSdkEnv(): "prod" | "demo" {
  return AIRWALLEX_ENV === "production" ? "prod" : "demo";
}

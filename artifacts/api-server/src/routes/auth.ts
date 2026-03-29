import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  clearSession,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const BCRYPT_ROUNDS = 12;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || "";
const APPLE_CLIENT_SECRET = process.env.APPLE_CLIENT_SECRET || "";

const ADMIN_EMAIL = "firdous.mahmood26@gmail.com";

const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function buildSessionUser(dbUser: {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  planType: string;
  role: string;
}) {
  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    profileImageUrl: dbUser.profileImageUrl,
    planType: (dbUser.planType as "free" | "pro" | "enterprise") || "free",
    role: (dbUser.role as "user" | "admin") || "user",
  };
}

async function seedAdminUser() {
  try {
    const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const insertValues: Record<string, unknown> = {
      email: ADMIN_EMAIL,
      firstName: "Firdous",
      lastName: "Mahmood",
      authProvider: "email",
      role: "admin",
      planType: "enterprise",
      subscriptionStatus: "active",
    };

    if (adminPassword) {
      insertValues.passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
    }

    await db
      .insert(usersTable)
      .values(insertValues as typeof usersTable.$inferInsert)
      .onConflictDoUpdate({
        target: usersTable.email,
        set: {
          role: "admin",
          planType: "enterprise",
          subscriptionStatus: "active",
        },
      });
    console.log("Admin user seeded:", ADMIN_EMAIL);
  } catch (err) {
    console.error("Failed to seed admin user:", err);
  }
}

seedAdminUser();

function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

router.post("/auth/signup", async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const isAdmin = emailLower === ADMIN_EMAIL;

    try {
      const [user] = await db
        .insert(usersTable)
        .values({
          email: emailLower,
          firstName: firstName?.trim() || null,
          lastName: lastName?.trim() || null,
          passwordHash,
          authProvider: "email",
          role: isAdmin ? "admin" : "user",
          planType: isAdmin ? "enterprise" : "free",
          subscriptionStatus: isAdmin ? "active" : null,
        })
        .returning();

      const sessionData: SessionData = {
        user: buildSessionUser(user),
      };

      const sid = await createSession(sessionData);
      setSessionCookie(res, sid);

      res.json({ user: sessionData.user });
    } catch (insertErr) {
      if (isUniqueConstraintError(insertErr)) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      throw insertErr;
    }
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "An error occurred during signup" });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, emailLower));

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.passwordHash) {
      const provider = user.authProvider || "social";
      res.status(401).json({
        error: `This account uses ${provider} sign-in. Please log in with ${provider}.`,
      });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const sessionData: SessionData = {
      user: buildSessionUser(user),
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);

    res.json({ user: sessionData.user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "An error occurred during login" });
  }
});

router.get("/auth/google", (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: "Google sign-in is not configured" });
    return;
  }

  const origin = getOrigin(req);
  const redirectUri = `${origin}/api/auth/google/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60 * 1000,
  });

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/auth/google/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query as { code?: string; state?: string };
  const expectedState = req.cookies?.oauth_state;

  res.clearCookie("oauth_state", { path: "/" });

  if (!code || !state || state !== expectedState) {
    res.redirect("/?auth_error=invalid_state");
    return;
  }

  const origin = getOrigin(req);
  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", await tokenRes.text());
      res.redirect("/?auth_error=token_exchange_failed");
      return;
    }

    const tokens = (await tokenRes.json()) as { access_token: string };

    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );

    if (!userInfoRes.ok) {
      res.redirect("/?auth_error=userinfo_failed");
      return;
    }

    const profile = (await userInfoRes.json()) as {
      id: string;
      email: string;
      verified_email?: boolean;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };

    if (profile.verified_email === false) {
      res.redirect("/?auth_error=email_not_verified");
      return;
    }

    const emailLower = profile.email.toLowerCase();
    const isAdmin = emailLower === ADMIN_EMAIL;

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, emailLower));

    let dbUser;
    if (existing) {
      [dbUser] = await db
        .update(usersTable)
        .set({
          firstName: profile.given_name || existing.firstName,
          lastName: profile.family_name || existing.lastName,
          profileImageUrl: profile.picture || existing.profileImageUrl,
          ...(isAdmin && existing.role !== "admin"
            ? { role: "admin", planType: "enterprise", subscriptionStatus: "active" }
            : {}),
        })
        .where(eq(usersTable.id, existing.id))
        .returning();
    } else {
      [dbUser] = await db
        .insert(usersTable)
        .values({
          email: emailLower,
          firstName: profile.given_name || null,
          lastName: profile.family_name || null,
          profileImageUrl: profile.picture || null,
          authProvider: "google",
          role: isAdmin ? "admin" : "user",
          planType: isAdmin ? "enterprise" : "free",
          subscriptionStatus: isAdmin ? "active" : null,
        })
        .returning();
    }

    const sessionData: SessionData = { user: buildSessionUser(dbUser) };
    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);
    res.redirect("/");
  } catch (err) {
    console.error("Google auth error:", err);
    res.redirect("/?auth_error=google_failed");
  }
});

router.get("/auth/apple", (req: Request, res: Response) => {
  if (!APPLE_CLIENT_ID) {
    res.status(503).json({ error: "Apple sign-in is not configured" });
    return;
  }

  const origin = getOrigin(req);
  const redirectUri = `${origin}/api/auth/apple/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 10 * 60 * 1000,
  });

  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "name email",
    state,
    response_mode: "form_post",
  });

  res.redirect(
    `https://appleid.apple.com/auth/authorize?${params}`,
  );
});

router.post("/auth/apple/callback", async (req: Request, res: Response) => {
  const { code, state, id_token } = req.body as {
    code?: string;
    state?: string;
    id_token?: string;
  };
  const expectedState = req.cookies?.oauth_state;

  res.clearCookie("oauth_state", { path: "/", sameSite: "none", secure: true });

  if (!code || !state || state !== expectedState) {
    res.redirect("/?auth_error=invalid_state");
    return;
  }

  const origin = getOrigin(req);
  const redirectUri = `${origin}/api/auth/apple/callback`;

  try {
    const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: APPLE_CLIENT_ID,
        client_secret: APPLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Apple token exchange failed:", await tokenRes.text());
      res.redirect("/?auth_error=apple_token_failed");
      return;
    }

    const tokens = (await tokenRes.json()) as { id_token: string };
    const jwtToken = tokens.id_token || id_token;
    if (!jwtToken) {
      res.redirect("/?auth_error=apple_no_token");
      return;
    }

    const { payload } = await jwtVerify(jwtToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: APPLE_CLIENT_ID,
    });

    const sub = payload.sub;
    if (!sub) {
      res.redirect("/?auth_error=apple_no_sub");
      return;
    }

    const appleEmail = payload.email as string | undefined;
    const emailLower = appleEmail?.toLowerCase() || `apple_${sub}@private.appleid.com`;
    const isAdmin = emailLower === ADMIN_EMAIL;

    const userBody = req.body as { user?: string };
    let appleFirstName: string | null = null;
    let appleLastName: string | null = null;
    if (userBody.user) {
      try {
        const nameData = JSON.parse(userBody.user) as {
          name?: { firstName?: string; lastName?: string };
        };
        appleFirstName = nameData.name?.firstName || null;
        appleLastName = nameData.name?.lastName || null;
      } catch (parseErr) {
        console.warn("Failed to parse Apple user data:", parseErr);
      }
    }

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, emailLower));

    let dbUser;
    if (existing) {
      [dbUser] = await db
        .update(usersTable)
        .set({
          ...(appleFirstName ? { firstName: appleFirstName } : {}),
          ...(appleLastName ? { lastName: appleLastName } : {}),
          ...(isAdmin && existing.role !== "admin"
            ? { role: "admin", planType: "enterprise", subscriptionStatus: "active" }
            : {}),
        })
        .where(eq(usersTable.id, existing.id))
        .returning();
    } else {
      [dbUser] = await db
        .insert(usersTable)
        .values({
          email: emailLower,
          firstName: appleFirstName,
          lastName: appleLastName,
          authProvider: "apple",
          role: isAdmin ? "admin" : "user",
          planType: isAdmin ? "enterprise" : "free",
          subscriptionStatus: isAdmin ? "active" : null,
        })
        .returning();
    }

    const sessionData: SessionData = { user: buildSessionUser(dbUser) };
    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);
    res.redirect("/");
  } catch (err) {
    console.error("Apple auth error:", err);
    res.redirect("/?auth_error=apple_failed");
  }
});

router.get("/auth/user", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.json({ user: null });
      return;
    }

    const [freshUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id));

    const user = freshUser ? buildSessionUser(freshUser) : req.user!;

    res.json({ user });
  } catch (err) {
    console.error("Get user error:", err);
    res.json({ user: null });
  }
});

router.get("/auth/session", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.json({ user: null });
      return;
    }

    const [freshUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id));

    const user = freshUser ? buildSessionUser(freshUser) : req.user!;

    res.json({ user });
  } catch (err) {
    console.error("Get session error:", err);
    res.json({ user: null });
  }
});

router.get("/auth/providers", (_req: Request, res: Response) => {
  res.json({
    email: true,
    google: !!GOOGLE_CLIENT_ID,
    apple: !!APPLE_CLIENT_ID,
  });
});

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.redirect("/");
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  try {
    const sid = getSessionId(req);
    if (sid) {
      await deleteSession(sid);
    }
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    res.json({ success: true });
  }
});

export default router;

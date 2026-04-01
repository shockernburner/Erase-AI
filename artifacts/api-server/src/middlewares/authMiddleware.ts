import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import {
  clearSession,
  getSessionId,
  getSession,
} from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

const DEMO_USER: AuthUser = {
  id: "system-demo-user",
  email: null,
  firstName: "Demo",
  lastName: "User",
  profileImageUrl: null,
  planType: "free",
  role: "user",
};

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const sid = getSessionId(req);
  if (!sid) {
    if (!req.path.startsWith("/api/admin")) {
      req.user = DEMO_USER;
    }
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    if (!req.path.startsWith("/api/admin")) {
      req.user = DEMO_USER;
    }
    next();
    return;
  }

  req.user = session.user;
  next();
}

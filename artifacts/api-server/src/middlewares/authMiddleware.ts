import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import {
  clearSession,
  getSessionId,
  getSession,
} from "../lib/auth";
import { isPublicRoute } from "../lib/publicRoutes";

declare global {
  namespace Express {
    interface User extends AuthUser {
      planStartDate?: string | null;
      planEndDate?: string | null;
    }

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
      apiKeyId?: string;
      apiKeyHasQuota?: boolean;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const isDevRoute = req.path.startsWith("/api/dev/");

  const sid = getSessionId(req);
  if (!sid) {
    if (!isPublicRoute(req.path) && !isDevRoute) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    if (!isPublicRoute(req.path) && !isDevRoute) {
      res.status(401).json({ error: "Session expired. Please log in again." });
      return;
    }
    next();
    return;
  }

  req.user = session.user;
  next();
}

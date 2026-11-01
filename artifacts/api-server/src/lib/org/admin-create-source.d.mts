export type AdminOwnerDecision =
  | { ok: true; mode: "claim"; userId: string; email: string; status: "active" }
  | { ok: true; mode: "invite"; email: string; status: "invited" }
  | { ok: false; status: number; error: string };

export function decideAdminOwner(input: {
  claimOwner: unknown;
  ownerEmail?: unknown;
  admin: { id: string; email?: string | null };
  activeElsewhere: boolean;
}): AdminOwnerDecision;

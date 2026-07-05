import type { MarketplaceUser } from "./types";

export function canWriteOwnedResource(ownerId: string | null | undefined, user: MarketplaceUser) {
  return user.role === "admin" || ownerId === user.id;
}

export function canReadOwnedRun(ownerId: string | null | undefined, user: MarketplaceUser) {
  if (user.role === "admin") return true;
  return Boolean(ownerId) && ownerId === user.id;
}

export class AuthorizationError extends Error {
  constructor(message = "You are not allowed to modify this resource.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

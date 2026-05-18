import "server-only";

// Business-rule violation detected during sync: not a server bug, but the
// operation cannot be applied because the world changed since enqueue
// (stock ran out, product was deactivated, reservation closed, permission
// revoked). The dispatcher maps this to result = CONFLICT.
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

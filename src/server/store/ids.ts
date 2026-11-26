import { randomBytes, randomUUID } from "node:crypto";

export const newId = () => randomUUID();

/** Unguessable URL-safe token (128+ bits) for QR codes and public links. */
export const newToken = (bytes = 18) => randomBytes(bytes).toString("base64url");

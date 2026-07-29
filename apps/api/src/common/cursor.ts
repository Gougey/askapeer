import { BadRequestException } from '@nestjs/common';

/**
 * Keyset pagination over a `(created_at desc, id desc)` sort — the shape every
 * reverse-chronological list in the API uses (posts, notifications, and whatever comes
 * next). Offset pagination would drift as new rows land at the head, showing a caller
 * the same row twice or skipping one entirely.
 *
 * The cursor is opaque to the client on purpose — it encodes the sort key, so making it
 * readable would invite callers to construct one and pin the ordering contract in place.
 */
export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
}

export function decodeCursor(cursor?: string): { createdAt: Date; id: string } | null {
  if (!cursor) return null;
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const createdAt = new Date(iso ?? '');
  // A malformed cursor is a bad request, not an empty page — silently returning nothing
  // would look like "you've reached the end" to anyone paginating.
  if (!id || Number.isNaN(createdAt.getTime())) throw new BadRequestException('Invalid cursor.');
  return { createdAt, id };
}

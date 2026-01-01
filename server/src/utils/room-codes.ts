/**
 * Room Code Generator
 *
 * Generates 6-character alphanumeric room codes.
 * Excludes ambiguous characters: 0/O, 1/I/L
 */

// Characters that are easy to read and type
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a random room code
 * @returns 6-character uppercase alphanumeric code (e.g., "K7MP3X")
 */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/**
 * Generate a unique room code that doesn't exist in the given set
 * @param existingCodes Set of codes already in use
 * @param maxAttempts Maximum attempts before giving up
 * @returns Unique room code or null if max attempts exceeded
 */
export function generateUniqueRoomCode(
  existingCodes: Set<string>,
  maxAttempts: number = 100
): string | null {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateRoomCode();
    if (!existingCodes.has(code)) {
      return code;
    }
  }
  return null;
}

// Shared contract for the admin Backup & Restore safety net.
//
// A backup is a plain JSON file the admin downloads from Settings & Audit and
// keeps (e.g., saved to their GC or phone files). Restoring it REPLACES the
// current participants/wishlists/assignments/event state.
//
// Design notes:
// - PINs are stored PLAIN in the backup (they are admin-only data anyway) so
//   the restore endpoint can recompute the peppered pinHash on whatever
//   server/pepper it runs on — backups stay portable across deployments.
// - Sessions are never backed up: restoring logs everyone out (sessionTokenHash
//   is always reset server-side).
// - Assignments are stored as identity-code pairs so they survive the
//   re-creation of participant ids during restore.

export interface BackupWishlist {
  wish1Name: string | null;
  wish1Details: string | null;
  wish2Name: string | null;
  wish2Details: string | null;
  wish3Name: string | null;
  wish3Details: string | null;
  submittedAt: string | null;
}

export interface BackupParticipant {
  firstName: string;
  lastName: string;
  /** "male" | "female" */
  sex: string;
  codeColor: string;
  codeWord: string;
  /** Display form, e.g. "Pink Gumamela" — recomputed server-side as `${codeColor} ${codeWord}`. */
  identityCode: string;
  /** Plain 6-digit PIN or null. */
  pin: string | null;
  isSample: boolean;
  /** ISO datetime or null (falls back to restore time). */
  createdAt: string | null;
  wishlist: BackupWishlist | null;
}

export interface BackupAssignment {
  /** Lowercase-insensitive identity code of the giver, e.g. "pink gumamela". */
  giverCode: string;
  recipientCode: string;
}

export interface BackupEvent {
  eventName: string;
  budgetMin: number;
  budgetMax: number;
  registrationOpen: boolean;
  submissionsLocked: boolean;
  lockedAt: string | null;
  /** "not_started" | "completed" | "released" */
  randomizationStatus: string;
  releasedAt: string | null;
}

export interface RestoreBackup {
  /** Always "monito-monita" — guards against restoring an unrelated JSON file. */
  app: string;
  /** Backup format version (currently 1). */
  version: number;
  createdAt: string;
  event: BackupEvent | null;
  participants: BackupParticipant[];
  assignments: BackupAssignment[] | null;
}

export const BACKUP_APP_TAG = "monito-monita";
export const BACKUP_VERSION = 1;

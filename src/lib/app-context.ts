// Shared client-side types for the single-page app's view router.

export type View =
  | "welcome"
  | "register"
  | "wishlist"
  | "confirmation"
  | "submitted"
  | "check"
  | "my-assignment"
  | "status"
  | "gc-message"
  | "admin-login"
  | "admin";

export interface Session {
  token: string;
  identityCode: string;
  /** In-memory only (never persisted): shown once on the confirmation page. */
  firstName?: string;
  lastName?: string;
  /** The 6-digit PIN, known only in-memory right after registration (never persisted). */
  pin?: string;
}

export interface EventStatus {
  eventName: string;
  budgetMin: number;
  budgetMax: number;
  registrationOpen: boolean;
  submissionsLocked: boolean;
  randomizationStatus: "not_started" | "completed" | "released";
  lockedAt: string | null;
  releasedAt: string | null;
  participantCount?: number;
}

export interface WishItem {
  name: string;
  details: string;
}

export interface AssignmentResult {
  recipientCode: string;
  wishes: WishItem[];
}

export interface AppCtx {
  navigate: (view: View) => void;
  session: Session | null;
  setSession: (s: Session | null) => void;
  event: EventStatus | null;
  refreshEvent: () => Promise<EventStatus | null>;
  assignment: AssignmentResult | null;
  setAssignment: (a: AssignmentResult | null) => void;
  goAdmin: () => void;
}

export interface WishlistDTO {
  wish1Name: string | null;
  wish1Details: string | null;
  wish2Name: string | null;
  wish2Details: string | null;
  wish3Name: string | null;
  wish3Details: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
}
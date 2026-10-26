# Worklog — Monito-Monita Christmas Exchange Gift App

Project: Next.js 16 App Router SPA at `/` (ONLY page route) + API routes under `/api/*`.
Stack: TypeScript, Tailwind 4, shadcn/ui (New York), framer-motion, sonner (toast), Prisma + SQLite.
Language: Taglish. Theme: Christ-centered Christmas (forest green #1B4332, gold #C9A227, burgundy #7A1E2B, cream #FBF5E6). NO Santa/elves/reindeer imagery.

## Architecture decisions (Task 1 — Foundation, done by lead)

- Single-page app: `src/components/app.tsx` holds a state-based view router. Participants and admin UI are views, not routes.
- Participant auth = private access token (32 random bytes, base64url). DB stores SHA-256 hash only. Token shown ONCE at registration as private link `/?access=<token>`.
- Admin auth = username + scrypt-hashed password, HMAC-signed session cookie `mm_admin_session` (httpOnly).
- Identity codes: Color + Flower(female)/Animal(male), unique via case-insensitive `codeKey` unique constraint. Real name unique too (`nameKey`).
- Randomization: server-side derangement with crypto.randomInt, constraint-verified before save.
- Event state machine in EventSettings: registrationOpen, submissionsLocked, randomizationStatus: not_started|completed|released.
- Admin seed (lazy, on first use): username from ADMIN_USERNAME env (default `admin`), password from ADMIN_PASSWORD env (default `monito2025`).

## API CONTRACT (all agents MUST follow exactly)

### Public endpoints

1. `GET /api/event` → 200
```json
{ "eventName": "string", "budgetMin": 150, "budgetMax": 200, "registrationOpen": true,
  "submissionsLocked": false, "randomizationStatus": "not_started|completed|released",
  "lockedAt": "string|null", "releasedAt": "string|null", "participantCount": 12 }
```

2. `POST /api/register` body `{ firstName, lastName, sex: "male"|"female", color, word }`
→ 201 `{ "identityCode": "Green Rose", "accessToken": "<raw token>" }` (token shown once)
→ 400 `{ "error": "Taglish message" }` (missing/invalid fields, invalid word for sex)
→ 409 `{ "error": "May gumagamit na ng code na ito. Please choose another color and flower/animal combination." }` or duplicate real name message
→ 403 `{ "error": "..." }` registration closed

3. `GET /api/me` header `Authorization: Bearer <accessToken>`
→ 200 `{ "identityCode": "Green Rose", "sex": "female", "wishlist": WishlistDTO|null, "submissionsLocked": false, "released": false }`
WishlistDTO: `{ "wish1Name": "string|null", "wish1Details": "string|null", "wish2Name": "string|null", "wish2Details": "string|null", "wish3Name": "string|null", "wish3Details": "string|null", "submittedAt": "string|null", "updatedAt": "string|null" }`
→ 401 `{ "error": "..." }`

4. `POST /api/wishlist` header Bearer, body `{ "wishes": [{ "name": "T-shirt", "details": "Size M, black" }] }` (1..3 items)
→ 200 `{ "wishlist": WishlistDTO, "updated": true|false }`
→ 400 (empty, >3 wishes, too long) | 401 | 403 locked `{ "error": "Naka-lock na ang submissions..." }`

5. `POST /api/access` body `{ "token": "<raw token or full URL containing ?access=>" }`
→ 200 `{ "identityCode": "...", "wishlistSubmitted": true, "submissionsLocked": false, "released": true|false,
   "assignment": null | { "recipientCode": "Blue Orchid", "wishes": [{ "name": "...", "details": "..." }] } }`
→ 401 `{ "error": "Hindi valid ang access link..." }` (unknown token). Assignment ONLY included when released===true.

### Admin endpoints (cookie auth `mm_admin_session`; all return 401 `{error}` if not signed in)

6. `POST /api/admin/login` `{ username, password }` → 200 `{ "username": "admin" }` | 401 `{ "error": "Mali ang username o password." }`
7. `POST /api/admin/logout` → 200 `{}`
8. `GET /api/admin/session` → 200 `{ "username": "admin" }` | 401
9. `GET /api/admin/overview` →
```json
{ "event": { ...same as GET /api/event, plus "lockedBy": "admin|null", "releasedBy": "admin|null" },
  "totals": { "participants": 12, "submitted": 10, "pending": 2, "sampleParticipants": 9, "duplicateCodes": 0 },
  "canRandomize": false, "blockers": ["Hindi pa naka-lock ang submissions.", "2 participants ang walang wishlist."] }
```
10. `GET /api/admin/participants` → `{ "participants": [{ "id", "firstName", "lastName", "sex", "identityCode", "isSample": bool, "createdAt", "wishlistSubmitted": bool, "submittedAt": "string|null", "wishlist": WishlistDTO|null }] }`
11. `POST /api/admin/participants/[id]/regenerate` → 200 `{ "privatePath": "/?access=<new raw token>" }` (new token, old invalidated; audit logged)
12. `POST /api/admin/lock` body `{ "locked": true|false }` → 200 `{ "submissionsLocked": true, "lockedAt": "...", "lockedBy": "admin" }`
    - Unlock allowed ONLY when randomizationStatus === "not_started" (else 400).
13. `POST /api/admin/randomize` → 200 `{ "batchId": "...", "assignments": [{ "giverCode": "...", "recipientCode": "..." }] }`
    → 400 `{ "error": "...", "blockers": ["..."] }` (must be locked, all wishlists submitted, >=2 participants, not already released)
14. `POST /api/admin/release` → 200 `{ "releasedAt": "...", "releasedBy": "admin" }` | 400 (must be completed) | 409 `{ "error": "Released na..." }` (already released)
15. `POST /api/admin/reset` → 200 `{}` — EMERGENCY reset after release: deletes ALL assignments, randomizationStatus→not_started, audit `RESET_ASSIGNMENTS`. Requires randomizationStatus==="released" or "completed".
16. `GET /api/admin/assignments` → `{ "released": bool, "releasedAt": "string|null", "batchId": "string|null", "assignments": [{ "giver": { "name": "Juan Dela Cruz", "code": "Green Rose" }, "recipient": { "name": "Maria Santos", "code": "Blue Orchid" }, "wishes": [{ "name": "...", "details": "..." }] }] }`
17. `GET /api/admin/audit` → `{ "logs": [{ "id", "actor", "action", "details", "recordId", "createdAt" }] }` (newest first)
18. `POST /api/admin/settings` body any of `{ eventName, budgetMin, budgetMax, registrationOpen }` → 200 `{ "event": {...} }`
19. `POST /api/admin/password` `{ currentPassword, newPassword }` → 200 | 400 (weak) | 401 (wrong current)
20. `POST /api/admin/sample-data` → 200 `{ "created": 9 }` — 9 sample participants (8 with wishlists + 1 without), isSample=true. Blocked (400) if submissionsLocked or randomizationStatus !== "not_started".
21. `DELETE /api/admin/sample-data` → 200 `{ "deleted": 9 }` — blocked (400) if submissionsLocked or randomizationStatus !== "not_started".
22. `GET /api/admin/export/participants` and `GET /api/admin/export/assignments` → `text/csv` attachment (participants.csv / assignments.csv).

### Error style
All errors: JSON `{ "error": "Friendly Taglish message" }`. Never leak stack traces, hashes, tokens (except the once-only responses above), or real names in public endpoints.

## DB schema (implemented in Task 1)
Participant(id, firstName, lastName, nameKey unique, sex, codeColor, codeWord, identityCode, codeKey unique, tokenHash unique, isSample, createdAt, updatedAt)
Wishlist(id, participantId unique FK, wish1Name, wish1Details, wish2Name, wish2Details, wish3Name, wish3Details, submittedAt, updatedAt)
Assignment(id, batchId, giverId FK, recipientId FK, createdAt; @@unique([batchId,giverId]), @@unique([batchId,recipientId]))
EventSettings(id "main", eventName, budgetMin, budgetMax, registrationOpen, submissionsLocked, lockedAt, lockedBy, randomizationStatus, releasedAt, releasedBy, updatedAt)
AdminAccount(id, username unique, passwordHash, role, status, createdAt)
AuditLog(id, actor, action, details, recordId, createdAt)

## Component contract for view agents
Shared types in `src/lib/app-context.ts`:
```ts
export type View = "welcome"|"register"|"wishlist"|"confirmation"|"submitted"|"check"|"my-assignment"|"status"|"admin-login"|"admin";
export interface Session { token: string; identityCode: string }
export interface AppCtx {
  navigate: (v: View) => void;
  session: Session | null;
  setSession: (s: Session | null) => void;
  event: EventStatus | null;
  refreshEvent: () => Promise<void>;
  assignment: AssignmentResult | null;
  setAssignment: (a: AssignmentResult | null) => void;
  goAdmin: () => void;
}
```
Every view: `export default function XView({ ctx }: { ctx: AppCtx })` — NO other exports, NO edits to app.tsx.
Available shared components: `GiftBox` (src/components/gift-box.tsx, props: onOpen, size?, label?), decor helpers in `src/components/decor.tsx` (LightGarland, Snowfall, SectionTitle, ChristmasCard, BudgetBadge, VerseFooter). Toast: `import { toast } from "sonner"`. API helper: `apiJson` in `src/lib/api-utils-client.ts`.

---
Task ID: 1
Agent: Lead (Z.ai Code)
Task: Foundation — schema, libs, theme, gift box, app shell

Work Log:
- Replaced prisma/schema.prisma with full domain model (Participant, Wishlist, Assignment, EventSettings, AdminAccount, AuditLog); pushed to SQLite (bun run db:push).
- Added env secrets: ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SESSION_SECRET in .env.
- Created src/lib/words.ts (20 colors / 20 flowers / 20 animals), validation.ts, derangement.ts (CSPRNG derangement + verifyDerangement), auth.ts (scrypt, HMAC session, SHA-256 token hashing, lazy seed, audit), api-utils.ts (server helpers), api-utils-client.ts (apiJson fetch helper), app-context.ts (View/AppCtx types, privateLink).
- Theme: globals.css Christmas palette (forest/gold/burgundy/cream), snowfall/twinkle/shimmer keyframes; layout.tsx with Playfair Display + Nunito fonts and sonner Toaster.
- Components: gift-box.tsx (framer-motion ribbon-unwrap, skip + reduced-motion), decor.tsx (LightGarland, Snowfall, SectionTitle, ChristmasCard, BudgetBadge, VerseFooter).
- app.tsx: state-based view router (only route /), boot logic handles ?access= private links, sessionStorage caches session token; page.tsx renders <App />.

Stage Summary:
- View files expected by app.tsx imports: src/components/views/{welcome,register,wishlist,confirmation,submitted,check,my-assignment,status}.tsx and src/components/admin/{login,dashboard}.tsx — created by Tasks 2-b and 2-c with exact `export default function XView({ ctx }: { ctx: AppCtx })` signature.
- API contract documented above — implemented by Task 2-a.
- DO NOT run `bun run dev`, `bun run build`, or `bun run lint` in subtasks; lead integrates.

---
Task ID: 2-b
Agent: full-stack-developer (participant views)
Task: Participant-facing UI views — 8 files under src/components/views/ per API contract + design rules

Work Log:
- Created src/components/views/welcome.tsx — festive hero (Star+TreePine row, "Maligayang Pasko!" with gold-shimmer accent, event name subheadline, BudgetBadge), GiftBox (size 180, onOpen → register), welcome-back ChristmasCard when session exists (Ipadagpat ang Wishlist / Tingnan ang Monito-Monita ko), 3 quick-action cards (Gift/KeyRound/Bell → register/check/status), numbered gold-circle 3-step info card, Christ-centered closing note.
- Created src/components/views/register.tsx — names, sex as two radio-card Labels (Babae/Lalaki, resets word on change), Color + Flower/Animal shadcn Selects (word Select remounts via key={sex} so reset is clean), live preview box with gold star + font-heading code, unique-combination helper text, client validation (names ≥2 chars, all required, inline errors + toast), registration-closed Alert hides form, POST /api/register → setSession + navigate("confirmation"), 409/duplicate shown via inline destructive Alert + toast, back link to welcome.
- Created src/components/views/wishlist.tsx — no-session notice card (register/check buttons), /api/me load with Skeletons + loadError alert, identity code chip + BudgetBadge, EXACT reminder text (₱min–₱max, realistic/considerate, sizes/details, max 3 wishes) in gold-bordered note, locked mode = read-only burgundy Alert listing submitted wishes (or "Wala ka pang naisubmit..." message), else 3 fieldset groups (Gift Wish #1-3 with per-group placeholders for name + details), prefill from existing wishlist (edit mode → "Update Wishlist" label), review step (numbered wishes + identity chip + budget note) with "Balikan at I-edit" / "Submit Wishlist", POST /api/wishlist with token option → toast + navigate("submitted"), at-least-1-wish validation, all errors toasted.
- Created src/components/views/confirmation.tsx — redirect to register when no session; PartyPopper+Star header, "Registration Successful! 🎉", one-time private link explanation, readonly mono Input with privateLink(token) + Copy button (clipboard API with execCommand fallback, Check icon + "Nakopya!" for 2s, toast "Nakopya na ang link!..."), bookmark hint, Proceed sa Wishlist 🎁 (primary) + View Status (secondary).
- Created src/components/views/submitted.tsx — unrevealed state = centered GiftBox (170, "Pindutin para i-reveal ang confirmation!") with built-in Skip; reveal = framer-motion fade-in with PartyPopper, submitted copy, edit-while-open info card, View Status / I-edit ang Wishlist (hidden when event.submissionsLocked) / Back to Home, private-link reminder card → confirmation view when session exists.
- Created src/components/views/check.tsx — explanation copy, Textarea for link-or-token (accepts /?access=… via module-level extractToken), "Gamitin ang naka-save kong access" fills token when session exists, POST /api/access with Loader2 submitting state: released+assignment → setAssignment + setSession(extracted token) + toast + inline GiftBox(150) → my-assignment; released-no-assignment gold Alert; not-released friendly status card with event status chips (module-level StatusChips: registration/submissions/bunutan badges + participant count); invalid token → destructive Alert ("Hindi valid o expired ang access link...") + toast with server message; session-assignment banner links to my-assignment; bottom Event Status Summary card (refreshEvent on mount, Skeletons while null).
- Created src/components/views/my-assignment.tsx — redirect to check when missing assignment/session; Congratulations card with Gift icon, "Ang Monito/Monita mo ay si" + BIG gold-shimmer recipientCode (codes only, never real names), secret-reminder line, numbered gold-circle wishlist (bold name + muted details, empty-wishes fallback), gold budget reminder Alert text + BudgetBadge, "I-save ang Private Link" copy button (clipboard + fallback, Check 2s), Check Again Later, Back to Home, bookmark note.
- Created src/components/views/status.tsx — refreshEvent on mount + setInterval 15s with cleanup; 3-phase vertical timeline (border-l gold line, 36px icon markers: Sparkles/Gift/Star) with ChristmasCards: Registration OPEN 🎉/CLOSED, Submissions OPEN/LOCKED 🔒 (+ "Na-lock noong {en-PH date}"), Bunutan mapped not_started→"HINDI PA NAGSISIMULA" muted / completed→"TAPOS NA ANG BUNUTAN — HINDI PA RELEASED" gold / released→"RELEASED NA! 🎉" green + "Puntahan ang Check" button; Skeletons while event null; bottom hint card with BudgetBadge + admin-contact text; auto-refresh caption.
- Quality bar applied throughout: mobile-first (sm:/md: grids), min-h-11/min-h-12 touch targets on all buttons, p-4 sm:p-6 card padding + gap-4/6, font-heading text-xmas-forest headings, primary buttons bg-xmas-forest text-xmas-cream hover:bg-xmas-pine, gold/burgundy accents only (no blue/indigo), Loader2/Skeleton loading states, disabled buttons while submitting, try/catch + sonner toast on every async path (no unhandled rejections), aria-labels/aria-live/semantic h1-h3 + fieldset/legend, no Santa/elves/reindeer imagery.
- Did NOT touch app.tsx, libs, API routes, admin views, schema, or any other file; did NOT run dev/build/lint/db commands (only mkdir -p src/components/views since the expected directory did not exist yet).

Stage Summary:
- All 8 participant views are complete and contract-exact: single `"use client"` default export `XView({ ctx }: { ctx: AppCtx })` per file, no other exports; app.tsx imports resolve (directory src/components/views created).
- API usage follows the documented contract: /api/register, /api/me (Bearer via apiJson token option), /api/wishlist, /api/access, /api/event via ctx.refreshEvent.
- Token handling: private link shown once at confirmation (copy + bookmark hint); check view accepts raw token or full URL and extracts ?access= value; my-assignment guards missing assignment/session and redirects to check.
- Remaining for other agents: Task 2-a API routes, Task 2-c admin views (src/components/admin/{login,dashboard}.tsx); lead runs integration + lint/build.

---
Task ID: 2-c
Agent: full-stack-developer admin views
Task: Admin UI — login view + 6-tab admin dashboard (admin endpoints 6–22)

Work Log:
- Created src/components/admin/login.tsx: `export default function AdminLoginView({ ctx }: { ctx: AppCtx })` — centered ChristmasCard (max-w-md), gold LockKeyhole circle, font-heading "Admin Login", Username + Password inputs with Eye/EyeOff toggle, "Sign In" with Loader2 + double-submit guard, default-credentials hint box (admin / monito2025 → palitan sa Settings & Audit), 401 → toast.error(err.message), success → toast.success("Welcome, {username}!") + ctx.goAdmin(), ghost "Back to Home" → ctx.navigate("welcome").
- Created src/components/admin/dashboard.tsx: `export default function AdminDashboardView({ ctx }: { ctx: AppCtx })` with session gate on mount (GET /api/admin/session; 401 → toast "Kailangan mag-login mula." + navigate to admin-login). Header: SectionTitle "Admin Dashboard" + username badge, Refresh (RefreshCw — calls ctx.refreshEvent() + bumps shared `dataVersion` that every tab refetches on), Print (window.print()), Logout (POST /api/admin/logout → toast + navigate admin-login).
- Dashboard = shadcn Tabs (defaultValue "overview") with 6 triggers (Overview | Participants | Lock & Validation | Randomization | Release | Settings & Audit); each tab is a non-exported component in the same file receiving { version: dataVersion, onMutate }; shared `useAdminFetch(url, version)` hook fetches on mount/version change with toast.error + loading skeletons for all tables/cards.
- Overview tab: 2×2-sm/4-lg stat cards (Total Registered/Users, Wishlists Submitted/ClipboardList "X of Y", Pending Wishlists/Clock burgundy when >0, Duplicate Codes/ShieldAlert "0 — safe!" green at 0) + 3 status cards (Registration Open/Closed, Submissions Open/LOCKED since/by, Randomization Not Started/Completed/RELEASED with lockedBy/releasedBy) + destructive blockers Alert vs green "Ready na ang lahat…🎉" Alert + pendingCodes mono chips card.
- Participants tab: search (name/code, case-insensitive) + status Select (All/Submitted/Pending/Sample only) + <a download> Export CSV; nice-scroll max-h-[65vh] sticky-header table (First/Last Name, Sex Babae/Lalaki, mono bold Identity Code, Submitted green / Pending amber / SAMPLE burgundy-outline badges, Submitted At via fmt()); actions: View Wishlist (Eye → dialog with 3 wishes or toast.info "Wala pang wishlist.") and New Access Link (KeyRound → AlertDialog confirm → POST regenerate → success dialog with readonly full link + Copy via navigator.clipboard + "I-show/copy ito ngayon lang" warning).
- Lock tab: pre-lock checklist (pending count + chips, Check/X items "All wishlists submitted?" / "Registration reviewed?"), exact warning text, burgundy "Lock All Submissions" (disabled when locked/0 participants) → AlertDialog → POST lock {locked:true} → toast "Naka-lock na ang lahat ng submissions! 🔒" + onMutate (refreshEvent + refetch); locked state card "LOCKED since/by" + Unlock (secondary, only when randomizationStatus==="not_started", else disabled with "Hindi na pwede i-unlock…" note) + confirm dialog → POST lock {locked:false}.
- Randomization tab: !canRandomize → blockers Alert + disabled button; else gold Alert + required "Na-double-check ko na ang participants." Switch before enabled "🎲 Start Randomization" (Loader2 + double-click guard) → POST → toast "Valid assignment generated! Walang nagdrowing ng sarili. ✅" + reload; results card with mono batchId, Giver|Recipient|Recipient Wishlist table (View → wishes dialog), "Real names visible sa admin only… (verified derangement)" note, secondary "Re-randomize (uli)" + confirm while not released, locked Info alert when released.
- Release tab: not_started → info Alert; completed → card "{count} assignments ready" + burgundy "🚀 Release Assignments sa Participants" → AlertDialog ("Sigurado ka na bang i-release…") → POST release → toast 🎉 + onMutate; released → green Alert "RELEASED na po noong {releasedAt} by {releasedBy}. ✅" + hint text + Emergency Reset pointer.
- Settings & Audit tab: (1) Event Settings form (eventName, budgetMin/Max with client validation) → POST settings + registration Open/Closed Switch with confirm AlertDialog; (2) Security change-password form (match + ≥8 chars client checks, 401 surfaces server Taglish message); (3) Sample Data card (count from overview, Generate POST / Delete confirm DELETE, disabled when locked/randomized); (4) Emergency Reset card only when completed/released — type-to-confirm "RESET", destructive button, POST reset → toast.error("Na-reset ang bunutan.") + full reload; (5) Audit Log table (Time "MMM d, h:mm a", Actor badge, mono bold Action, wrapped Details; nice-scroll max-h-96) + Refresh + <a download> Export Assignments CSV.
- Quality: all mutations have submitting/disabled guards (randomize/release/lock/unlock/logout/regenerate/settings/password/sample/reset), all fetches try/catch → toast.error(err.message), loading skeletons everywhere, p-4 sm:p-6 card padding + gap-4/6, mobile-responsive (horizontal-scroll tabs, overflow-auto tables with min-width), aria-labels on all icon-only buttons/inputs, `fmt`/`fmtShort` date helpers in-file, Christmas palette only (forest/gold/burgundy/cream + #2d6a4f green; no blue/indigo/Santa), lucide-react icons only.
- Verified with `bunx tsc --noEmit` (read-only check): both admin files compile with zero errors (remaining project errors belong to examples/skills folders and Task 2-b's pending view files).

Stage Summary:
- src/components/admin/login.tsx and src/components/admin/dashboard.tsx are complete and match the app.tsx import contract exactly (single default export each, `{ ctx }: { ctx: AppCtx }`). No other files were created or modified.
- Dashboard consumes only the documented admin endpoints 6–22; regenerate handles both `{privatePath}` and `{privatePath, identityCode}` response shapes. All mutations refresh ctx.event via onMutate so participant views stay in sync.
- Print support relies on existing `no-print` utility class; garland/snowfall are already excluded from print by Task 1.

---
Task ID: 2-a
Agent: general-purpose API agent (report lost to transport error; files verified complete by lead)
Task: Backend API routes per contract (endpoints 1–22)

Work Log:
- Agent created all 22 route files under src/app/api/ before its final report transport failed; lead verified all files exist with full implementations (runtime=nodejs, force-dynamic) and `bunx tsc --noEmit` passes with zero errors in src/.
- Public: event, register (uniqueness via codeKey/nameKey + P2002 guard), me, wishlist (lock check, upsert, audit), access (SHA-256 token lookup, assignment only when released).
- Admin: login/logout/session, overview (totals, canRandomize+blockers, pendingCodes), participants, participants/[id]/regenerate, lock/unlock (unlock blocked after randomization), randomize (derangement + in-transaction verify), release (409 on double release), reset (emergency), assignments (real names admin-only), audit, settings, password, sample-data (POST 9 samples incl. 1 pending / DELETE), export/[type] CSV with BOM.

Stage Summary:
- Full API contract implemented and type-clean. Lead proceeds to integration lint + browser E2E.

---
Task ID: 3
Agent: Lead (Z.ai Code)
Task: Integration + full E2E verification

Work Log:
- Fixed 1 ESLint error in admin dashboard (react-hooks/set-state-in-effect: refactored useAdminFetch to derive loading from fetched-version state).
- `bun run lint`: 0 errors. `bunx tsc --noEmit`: 0 errors in app code.
- curl API suite verified ALL acceptance criteria: register/duplicate-code-409/invalid-word-400, wishlist submit/empty-400/four-wishes-400, admin login fail-401/unauthorized-401, randomize-before-lock-400, lock, edit-after-lock-403, randomize (derangement verified programmatically: bijection, no self-assignment, unique recipients), access-before-release null, release, double-release-409, access-after-release with assignment, invalid token-401, CSV export with BOM, sample-data blocked after lock, audit log complete, emergency reset, unlock-after-reset.
- Browser E2E (agent-browser, desktop 1280px + mobile 390px): gift-box unwrap → register (Crimson Dahlia live preview) → one-time private link confirmation → wishlist reminder + 3 wishes → review (exact spec buttons) → gift-box reveal confirmation → admin login → dashboard stats/blockers → sample data generate → participants table (SAMPLE badges, pending demo) → pre-lock checklist → lock with confirm dialog → randomization blocked with pending participant → admin regenerated access link (recovery flow) → unlock → wishlist via recovered link → re-lock → randomize (9 valid assignments) → release with confirm → participant retrieved assignment via saved token → gift box reveal showed recipient code + wishes + budget, NO real names → status timeline → invalid token error handling → mobile responsive checks.
- One client-side exception observed was self-inflicted (test eval removed sonner-managed DOM nodes); page reload recovered cleanly — not an app bug.
- dev.log: no runtime errors. DB reset to pristine state for the real event (admin account kept; sample data regenerable via admin Settings).

Stage Summary:
- ALL acceptance criteria PASS. App is production-ready. Admin: admin / monito2025 (changeable in Settings & Audit).

---
Task ID: 4
Agent: Lead (Z.ai Code)
Task: 2026 fixes + 6-digit PIN access system (replace link-first flow after admin lock)

Work Log:
- Year fixes: ADMIN_PASSWORD default monito2025→monito2026 (.env + src/lib/auth.ts lazy seed), admin login hint, dashboard event-name placeholder, schema default eventName → "Christmas Fellowship Monito-Monita 2026". Deleted old AdminAccount row so lazy seed re-creates with the new password; verified admin/monito2026 login works.
- Schema: Participant += pinHash String? @unique (HMAC-SHA256 of the 6-digit PIN with PIN_PEPPER env) and sessionTokenHash String? @unique (ephemeral token issued on PIN login); pushed via db:push.
- src/lib/auth.ts: added hashPin/normalizePin/isValidPin/randomSixDigitPin helpers.
- New src/lib/rate-limit.ts: in-memory sliding-window limiter (purges stale buckets); access-pin uses 8 attempts / 10 min per IP, resets on success. Verified 429 after limit.
- /api/register: requires `pin` (6 digits), unique-PIN enforcement with pre-check + P2002 target discrimination → 409 "May gumagamit na ng PIN na ito...".
- New POST /api/access-pin: validates PIN, rate-limits, issues fresh session token (stores only its SHA-256 in sessionTokenHash), returns access payload + token; assignment included ONLY when released; identical 401 message for wrong-PIN vs no-PIN (no info leak).
- /api/access refactored to shared buildAccessResult helper (src/lib/api-utils.ts); participantFromRequest now resolves BOTH tokenHash (private link) and sessionTokenHash (PIN session) so all Bearer endpoints (/api/me, /api/wishlist) accept PIN sessions. Old private links remain valid — both key types coexist.
- app-context.ts Session += pin?: string; app.tsx persists session WITHOUT the PIN (in-memory only).
- register.tsx: gold "Gumawa ng iyong 6-digit PIN" card with two InputOTP (REGEXP_ONLY_DIGITS) fields + confirm; client validation (complete/match); pin sent to API.
- confirmation.tsx rewritten: PRIMARY big gold PIN display + copy; private link demoted to "Backup: Private Access Link (opsyonal)" card.
- welcome.tsx: when event.submissionsLocked → home becomes PIN-entry screen (hero + lock badge + InputOTP + "Pumasok gamit ang PIN" + fallback link to check view + Status/Register quick actions); correct PIN pre-release → toast + status view; released → my-assignment; released-no-assignment → gold alert. Pre-lock welcome unchanged except PIN mention in steps/quick actions.
- check.tsx: PIN form is now primary (InputOTP + submit), private link form demoted under an "o kaya" divider as backup; shared handleSuccess.
- my-assignment.tsx: replaced copy-link card with PIN reminder ("I-type lang ang 6-digit PIN mo sa Home page") + admin-recovery note; actions now Back to Home + View Status.
- submitted.tsx: session card now says "Tandaan ang 6-digit PIN mo" with "Tingnan ang PIN ko" button.
- Sample-data route: generates globally-unique random PINs for samples via randomSixDigitPin.

Verification (curl + agent-browser E2E):
- API: register w/ PIN 201; duplicate PIN 409; missing PIN 400; wrong PIN 401; right PIN 200+token; 9th attempt 429; /api/me + wishlist accept PIN-issued token; old link token still valid; assignment only after release; derangement valid (2-person bidirectional check).
- Browser (desktop 1280 + mobile 390): register with PIN fields + live code preview → confirmation shows big PIN + backup link → wishlist submit → gift reveal with PIN reminder → admin login (monito2026) → lock → HOME SWITCHES TO PIN ENTRY → wrong PIN inline error → correct PIN lands on status (pre-release) → randomize+release → PIN again → my-assignment shows recipient code + wishlist (no real names) → check view PIN primary + link backup works → admin dashboard stats/status correct (re-randomize blocked after release) → footer/header show 2026.
- dev.log clean (no runtime errors); lint 0 errors; tsc clean in src/.
- DB reset to pristine for the real event: 0 participants, unlocked, not_started, admin account kept (admin / monito2026).

Stage Summary:
- Participants now create a personal 6-digit PIN at registration; after the admin locks submissions, the home page is a simple PIN entry screen (no links needed for non-techy users). Private links still work everywhere as backup; admin can still regenerate links. Rate limiting protects PIN brute force. All 2025 references are now 2026.

---
Task ID: 5
Agent: Lead (Z.ai Code)
Task: CSV export after randomization, remove Print, Log Out instead of Back to Home, senior-friendly polish

Work Log:
- Removed the header Print button (window.print() truncated wide tables) from the admin dashboard; header now has Refresh + Logout only. Dropped the now-unused Printer icon import.
- New POST /api/logout (src/app/api/logout/route.ts): invalidates ONLY the ephemeral PIN-session token (sessionTokenHash) via Bearer token; the private backup link (tokenHash) is untouched. Always 200, no info leak on garbage/missing tokens.
- Enhanced GET /api/admin/export/participants: when assignments exist (randomization completed/released) every participant row gains "Gives Gift To (Name/Code)", "Recipient Wishes", "Receives Gift From (Name/Code)" columns (filename becomes participants-with-bunutan.csv); before the bunutan it stays the plain 7-column list. Explicit BunutanRow type (Prisma conditional types don't survive typeof extraction; also caught a real bug — giver name/code were missing from the select).
- Admin dashboard Participants tab: fetches /api/admin/overview; when randomizationStatus is completed|released shows a prominent green "I-download ang Resulta ng Bunutan (CSV)" button (assignments export) + green explainer alert; renamed the always-on export to "I-download ang Listahan (CSV)". Row actions are now labeled outline buttons ("Wishlist" / "Bagong Link") instead of icon-only; table min-width 880px.
- Randomization tab results card: added "I-download ang Resulta (CSV)" green button next to the assignments badge.
- my-assignment.tsx: "Back to Home" replaced by "Log Out" — calls POST /api/logout, clears assignment + session (sessionStorage removed), toast "Naka-log out na. 👋...", navigates to welcome (which is the PIN-entry screen post-lock); added `loggedOut` guard so the missing-assignment redirect doesn't fight the logout. Updated "Para makabalik" copy: PIN is always re-asked even after refresh/browser close. Slightly larger type for senior readability.
- app.tsx: refreshEvent now returns EventStatus|null (AppCtx type updated); boot NO LONGER restores the session from sessionStorage once submissionsLocked — post-lock the app is PIN-per-visit, so a refresh always lands on the PIN-entry home. Pre-lock behavior unchanged (registration→wishlist convenience).
- welcome.tsx locked-home session card: added a burgundy "Log Out" button (also clears storage).
- Accessibility fix found by mobile E2E: header nav buttons had empty accessible names on mobile (labels are hidden sm:inline) — added aria-label Home/Status/Admin login.

Verification (curl + agent-browser desktop 1280 + mobile 390):
- CSV: before randomization = plain list; after release = 12-column enriched rows verified against the derangement (Green Rose→Blue Eagle→Crimson Dahlia→Green Rose, wishes joined "name (details) | ..."). Assignments export unchanged and correct.
- Logout API: PIN session 200→logout→401 on same token; private link token still 200; re-PIN-login works; garbage/missing token → ok:true silently.
- Browser: locked home PIN entry → PIN 111222 → my-assignment (Log Out + View Status, no Back to Home) → Log Out toast → welcome PIN entry → RELOAD still PIN entry (session not retained). Admin: no Print button; Participants tab shows both labeled CSV buttons + green explainer alert (bunutanDone) + labeled row actions; Randomization tab results card has the CSV button; downloads point at /api/admin/export/{assignments,participants} with download attr.
- Mobile 390px: full-width stacked export buttons, horizontally scrollable table, big shimmer recipient code, numbered wishlist, Log Out loop verified; aria-label fix confirmed (buttons named).
- lint 0 errors; tsc clean in src/; dev.log no runtime errors.
- DB reset to pristine for the real event (0 participants, unlocked, not_started, audit cleared, admin account kept: admin / monito2026).

Stage Summary:
- After the bunutan the admin can download everything from the Participants window as CSV (full names, codes, who-gives-to-whom, wishes) — Print removed because it cut off table columns.
- Post-release participant sessions are ephemeral by design: Log Out (and any refresh) always returns to the 6-digit PIN home screen, which is now the sole revisit avenue for monito/monita details. Private backup links + admin link regeneration still work as recovery.

---
Task ID: 6
Agent: Lead (Z.ai Code)
Task: "Delete All Data" admin action requiring the admin password

Work Log:
- New POST /api/admin/wipe (src/app/api/admin/wipe/route.ts): requires BOTH the admin session cookie AND the admin password in the body (scrypt verifyPassword against AdminAccount). Wrong/missing password → 401/400 Taglish message, NOTHING deleted. On success, inside one transaction: deletes all assignments → wishlists → participants, resets EventSettings state (unlocked, lockedAt/By + releasedAt/By null, randomizationStatus not_started). Keeps event name/budget/registration flag, admin account, and audit log. Writes a DELETE_ALL_DATA audit entry with exact deleted counts. 500 path explicitly says nothing was deleted.
- Settings & Audit tab: new burgundy-bordered "Delete All Data" card (card 5, before Audit Log) — trash icon, plain-Taglish warning of what is lost and what is kept ("Kailangan ang admin password para tumuloy."), password input + destructive button disabled until a password is typed, then an AlertDialog confirm ("Burahin ang LAHAT ng data?" → "Oo, burahin lahat"). Success toast reports exact counts, clears the field, and onMutate() refreshes every tab (event back to fresh state). Wrong password → error toast and the dialog auto-closes so the admin can retype (UX fix added after E2E).
- Verified doWipe busy-guards (double-submit safe), aria-labels, and Christmas palette only.

Verification (curl + agent-browser):
- API: no session → 401; no password → 400; WRONG password → 401 "Mali ang admin password. Walang binura na data." with data intact (2 participants still present); correct password → 200 {ok, deleted:{participants,wishlists,assignments}}; after wipe /api/event shows participantCount 0, submissionsLocked false, randomizationStatus not_started; audit log keeps history + DELETE_ALL_DATA rows with true counts (verified 3 wipes: 2, 1, 0 participants).
- Browser (1280px): Settings & Audit shows the card; button disabled until password typed; wrong password → toast "Mali ang admin password..." + data intact; correct password → confirm dialog → success toast "Nabura na ang lahat — N participants..." and all tabs refresh to fresh state; audit table renders the DELETE_ALL_DATA trail. One first-click-after-fill oddity was traced to the test harness fill race (real keystroke typing + single click works every time) — not an app bug.
- lint 0 errors; tsc 0 errors in src/; dev.log clean.
- DB left pristine for the real event (0 participants, unlocked, not_started, audit cleared, admin account kept: admin / monito2026).

Stage Summary:
- Admin now has a password-protected nuclear reset: Settings & Audit → Delete All Data (admin password + confirm dialog). It wipes participants/wishlists/assignments and resets the event to registration-fresh, while keeping settings, the admin account, and a full audit trail of every wipe.

---
Task ID: 7
Agent: Lead (Z.ai Code)
Task: Christmas Fellowship date (Dec 20), friendlier wishlist wording, Log Out under "Tingnan ang Monito/Monita ko"

Work Log:
- New src/lib/event-config.ts: FELLOWSHIP_DATE = "December 20, 2026" (single source of truth for the gift-giving day).
- decor.tsx: new shared FellowshipDateBadge (pine-green pill with CalendarDays icon, "Christmas Fellowship: December 20, 2026"); VerseFooter now shows "{eventName} • Christmas Fellowship: December 20, 2026" on its own line above the existing footer text — so the date is visible on every page.
- welcome.tsx: FellowshipDateBadge added to BOTH heroes (normal home + locked PIN-entry home, right under the event name). "Ipadagpat ang Wishlist" → "Ituloy ang Wishlist" (familiar Taglish). Normal-home welcome-back card restructured: below the Wishlist/Check buttons there is now a divider + burgundy ghost "Log Out" button with a one-line explainer ("Buburahin ang session mo sa device na ito — hindi makikita ng susunod na gagamit ang details at account mo."). handleLogout toast is state-aware: locked → "i-type lang muli ang PIN mo", unlocked → "gamitin muli ang private access link mo o i-type ang PIN mo".
- status.tsx: FellowshipDateBadge added under the "Event Status" title (above the auto-refresh note).
- my-assignment.tsx: new pine-green reminder note next to the budget reminder: "Ihanda ang gift mo para sa Christmas Fellowship — December 20, 2026! Doon natin ibibigay ang mga regalo. 🎄" (CalendarDays icon, role=note).

Verification (curl + agent-browser desktop 1280 + mobile 390):
- Registered Emerald Hawk (PIN 123456) via API → access link → Home: card shows "Kumusta, Emerald Hawk!", "Ituloy ang Wishlist", "Tingnan ang Monito/Monita ko", Log Out below with explainer; date badge in hero + footer. Clicked Log Out → card disappears, storage cleared; reload → still logged out (fresh welcome for the next device user).
- Full scenario via API: wishlists for 2 participants → admin lock → randomize (Emerald Hawk→Golden Rose) → release. Locked home shows date badge above the PIN entry; PIN 123456 → my-assignment shows recipient, wishlist, budget reminder AND the Dec 20 fellowship reminder; Log Out works.
- Wipe re-verified while resetting: no session → 401; wrong password → 401 "Mali ang admin password. Walang binura na data." (data intact); correct password → deletes all + resets event (participantCount 0, unlocked, not_started).
- Mobile 390px: fresh registration (Teal Falcon) → normal home card stacks vertically with Log Out below "Tingnan ang Monito/Monita ko"; locked-home session card also fine; footer wraps date nicely.
- lint 0 errors; tsc clean in src/; dev.log no errors.
- DB left pristine for the real event (0 participants, unlocked, not_started; audit retains history; admin account kept: admin / monito2026).

Stage Summary:
- The Christmas Fellowship date (December 20, 2026) is now visible app-wide: both welcome heroes, Status page, My Assignment reminder ("bring your gift that day"), and the footer on every page.
- The welcome-back card says "Ituloy ang Wishlist" and has a Log Out button below "Tingnan ang Monito/Monita ko" so the next person on the same device starts with a clean screen — logged-out sessions never persist across refresh.

---
Task ID: 8
Agent: Lead (Z.ai Code)
Task: Remove the private access link system; sign-in is now First name + Last name + 6-digit PIN

Work Log:
- Schema: dropped Participant.tokenHash (private-link token) via db:push; kept sessionTokenHash (ephemeral session issued at registration / name+PIN sign-in). One active session per participant (each sign-in replaces it).
- DELETED POST /api/access and /api/admin/participants/[id]/regenerate (link routes). Any /?access=... URL is now just an ordinary home visit.
- POST /api/access-pin is now the single sign-in: body { firstName, lastName, pin }. Matches by nameKey (lowercased "first last", case-insensitive, whitespace-normalized) then compares peppered pinHash. ONE generic 401 for unknown name / wrong PIN / no PIN (no enumeration); 400 Taglish for missing fields; same 8-per-10-min IP rate limit; issues fresh sessionToken on success. Assignment attached ONLY when released.
- POST /api/register no longer mints link tokens — creates the participant and starts a session (returns { identityCode, sessionToken }). Duplicate-name 409 copy now says to sign in with name+PIN.
- NEW POST /api/admin/participants/[id]/reset-pin (admin session required): sets a new 6-digit PIN (P2002 duplicate-PIN 409 handled), nulls the participant's sessionTokenHash (old sessions die), audits PIN_RESET. This replaces "new link" as the forgotten-PIN recovery path.
- participantFromRequest now resolves ONLY sessionTokenHash; auth.ts dropped extractToken; /api/me + /api/wishlist 401 copy updated; logout comment updated; sample-data no longer writes tokenHash.
- check.tsx REWRITTEN as a Sign In card (First name w/ user icon, Last name, 6-digit OTP, "Sign In" button) — link form/textarea/extractToken/useSavedAccess removed; keeps status chips, not-released card, no-assignment alert, gift-box reveal.
- welcome.tsx locked home: sign-in card with First/Last name inputs above the OTP (submit "/api/access-pin"), error title "Hindi tama ang details.", footer note "Nakalimutan mo ang pangalan o PIN mo? ... i-reset ang PIN mo". handleLogout now ALSO clears name/PIN/error/noAssignment state so the next device user gets a pristine form.
- confirmation.tsx: link card REMOVED; new "Ang sign-in mo" card (First name / Last name / Identity code from in-memory session; "—" fallback after refresh) + PIN box. Session type gained memory-only firstName/lastName.
- register.tsx: sessionToken response + stores names in session; wishlist.tsx no-session card: "Mag-sign in" (check) / "Mag-register"; submitted.tsx + status.tsx + my-assignment.tsx copy: name+PIN sign-in, admin PIN reset instead of new links; dashboard release toasts copy updated.
- dashboard.tsx: "Bagong Link" → "I-reset ang PIN" (KeyRound button per row → AlertDialog with 6-digit InputOTP, action disabled until 6 digits, success toast reminds admin to hand the PIN over). Removed regen dialogs/copyText/Copy icon; added input-otp imports.

Verification (curl + agent-browser desktop 1280 + mobile 390):
- API: register → {identityCode, sessionToken}; sign-in case-insensitive ("juan dela cruz" + PIN) → 200; wrong name AND wrong PIN → same generic 401; missing name → 400; /api/access → 404; /api/me + wishlist with fresh token → 200 (stale token after re-login → 401, single-session by design); reset-pin: no auth 401, 5-digit 400, valid → old PIN dead, new PIN works; audit PIN_RESET row written; sample-data route compiles/runs (tokenHash-free); wipe OK.
- Full lifecycle: lock → (unlock) wishlist → lock → randomize → release → sign-in returns recipient + wishes (Teal Falcon ↔ Golden Rose).
- Browser: locked home = sign-in form (First/Last/PIN) → wrong PIN shows "Hindi tama ang details." → correct → assignment reveal (Golden Rose) → Log Out → clean home; UI registration (Pedro Reyes / Violet Panda / PIN 333444) → confirmation shows "Ang sign-in mo" card + PIN, NO link card; admin Participants tab has "I-reset ang PIN" per row → dialog → reset to 445566 → old PIN rejected, new PIN signs in; Log Out clears form fields + stale alerts (desktop + mobile).
- Mobile 390: sign-in form stacks properly, date badge + footer intact.
- lint 0 errors; tsc clean in src/ (after clearing stale .next/types for deleted routes); dev.log clean.
- DB left pristine for the real event (0 participants, unlocked, not_started; audit history retained; admin account kept: admin / monito2026).

Stage Summary:
- The private access link system is GONE end-to-end: no tokens at registration, no /?access= handling, no backup-link UI, no admin link regeneration. The only way in for participants is First name + Last name + their 6-digit PIN (plus one active session per sign-in).
- Recovery path for forgotten PINs is now the admin "I-reset ang PIN" action (audited), which keeps the name+PIN model self-contained.

---
Task ID: 8
Agent: lead (Z.ai Code)
Task: Admin sees 6-digit PIN in table; admin manual participant entry (incl. wishlist); remove "walang link" sayings; fix unresponsive "Check My Monito/Monita" pre-release; UX hardening for non-tech-savvy users.

Work Log:
- Prisma schema: added `Participant.pin String?` (plain 6-digit PIN, admin-only visibility); db:push OK. pinHash remains the sign-in verification source.
- POST /api/register + reset-pin + sample-data now keep `pin` in sync with `pinHash` (restart required for Prisma Client reload — done).
- GET /api/admin/participants returns `pin` per row; participants CSV export gained a "6-Digit PIN" column (both with/without-bunutan variants).
- NEW POST /api/admin/participants — admin manual participant creation (First/Last/Sex/Color/Word/PIN + optional 1-3 wishes). Validation mirrors self-registration (name, PIN, sex-word pairing, unique nameKey/codeKey/pinHash). Allowed pre-draw even when submissions locked (huliang pasok); blocked after randomization.
- NEW PUT /api/admin/participants/[id]/wishlist — admin sets/fixes an existing participant's wishlist (rescue path post-lock, else randomize blocks forever). Blocked after randomization starts. Audited.
- Admin ParticipantsTab: new "6-Digit PIN" column (monospace), search also matches PIN, "Magdagdag ng Participant" dialog (sex-aware word select, InputOTP PIN, optional 3-wish section), editable Wishlist dialog pre-draw (read-only after), reset-pin now refreshes the table (onMutate), updated empty state.
- Check view rework: pre-release now shows a live WaitingPanel (phase-specific message for not-started / locked / completed, StatusChips, 15s auto-refresh heartbeat, next-step buttons: Ituloy ang Wishlist / View Status / Mag-register / Balik sa Home) instead of a dead sign-in form; sign-in form only appears when released; removed `arguments[1]` anti-pattern.
- Copy cleanup: removed "Walang kailangang link! 🔑" (welcome), "walang link!" (check), "Walang link na kailangan." (submitted); updated quick-action sub and how-it-works step to mention First name + Last name + PIN.
- apiJson client: network failures now throw Taglish "Walang koneksyon sa server…" instead of raw English fetch errors.
- Verified via curl: register stores pin; manual add (valid/dup name/dup code/dup PIN/wrong word/bad PIN/no auth); reset-pin syncs plain PIN (old PIN fails, new works); sign-in of manually added participant; lock → manual add allowed; randomize → manual add + wishlist edit blocked; release → assignment visible; CSV headers.
- Verified via agent-browser (desktop 1280 + mobile 390): waiting panel pre-release; register → confirmation → wishlist → submitted; admin login → PIN column shows 123456; manual add dialog (Pedro Reyes/Crimson Hawk/234567 + wish) appears as Submitted row; lock → randomize → release; locked home 3-field sign-in → assignment (Juan→Pedro's wishlist, Pedro→Juan's wishlist); wrong PIN shows Taglish error alert; mobile layouts + sticky footer OK; no page errors (only pre-existing dev-only Radix Select warnings, same pattern as register.tsx).

Stage Summary:
- Admin can now read/re-share every participant's 6-digit PIN (table + CSV) and manually encode participants — including latecomers after lock, WITH wishlist so randomization never gets stuck.
- "Check My Monito/Monita" is never a dead end: live status panel with auto-refresh before release, sign-in form only when released.
- All "walang link" remnants removed; offline/network errors speak Taglish.
- DB wiped clean after testing (0 participants, unlocked, not_started; admin account intact). Admin credentials: admin / monito2026.

---
Task ID: 9
Agent: lead (Z.ai Code)
Task: "Made it difficult to get back to fill out their wishlist when they left it empty and reopened the app while submissions are still unlocked" — make the return path effortless for non-techy participants.

Work Log:
- Root cause map (pre-lock, no active session — closed tab / new tab / device switch): unlocked Home had NO sign-in (form only rendered when locked); Check page waiting panel offered "Mag-register" (wrong action → 409 grump) and no sign-in; Wishlist no-session card's "Mag-sign in" button navigated to Check — which had NO sign-in pre-release = circular dead end. Registered users were effectively stranded away from their wishlist.
- NEW shared component src/components/sign-in-card.tsx: First name + Last name + 6-digit PIN card (OTP slots, inline Taglish error alert + toast, loading state, unique idPrefix per placement, optional children for escape hatches). One source of truth used by Home (locked AND unlocked), Wishlist, and Check.
- welcome.tsx: unlocked Home now ALWAYS shows the sign-in card ("Nag-register na? Sign In dito") when no session; ONE smart handleSignIn routes post-login: released+assignment → my-assignment; released-no-assignment → alert; locked → status; UNLOCKED → straight to the wishlist with a state-aware toast ("Ituloy mo ang wishlist mo" / "Naka-save na — puwede mo pa i-edit"). Locked home refactored onto the same card. Session card on locked home gains a gold "Tingnan ang Monito/Monita ko" button once released (Check auto-resolves it). Gift box CTA relabelled "Bagong participant? Pindutin ang gift box para mag-register!" so returners don't wander into registration; Register quick-action sub copy updated; how-it-works step 2 now teaches "puwede mong balikan at i-edit — sign in lang".
- wishlist.tsx: no-session card replaced by the embedded SignInCard (sign in right where they landed; session effect loads their wishlist in place) + "Mag-register dito" link for true newcomers; released sign-in from here jumps to my-assignment. Load-error path reworked: "Subukan muli" (real retry via retryTick) + "Sign In muli" (clears stale session in place → sign-in card appears — fixes the stale-session trap after another device's sign-in invalidated the token).
- check.tsx: waiting panel embeds SignInCard when no session (kills the old register-first trap; register button demoted to "Bagong participant? Mag-register"); released mode uses SignInCard; NEW auto-resolve: a live session (signed in while waiting) fetches /api/me on release and reveals the gift box WITHOUT re-typing the PIN; resolving/"no assignment" states are explicit.
- /api/me extended: now returns assignment (when released, via buildAccessResult) + wishlistSubmitted — enables the auto-resolve and lets clients branch on submission state.
- register.tsx: duplicate-name 409 now also renders a "Nag-register na ako — Sign In sa Home" shortcut button (regex on the Taglish message) so the most common register-trap has a one-tap exit.

Verification (curl + agent-browser desktop 1280 + mobile 390):
- API: pre-lock sign-in returns wishlistSubmitted=false→true after submit, case-insensitive name match; /api/me returns assignment+wishlistSubmitted; wrong PIN → generic Taglish 401; duplicate name → 409 copy matching the new shortcut regex.
- Browser (unlocked): fresh home shows sign-in card; returning Juan (empty→submitted wishlist) signs in → routed straight to wishlist in edit mode with correct toast; Log Out → fresh form; Check waiting panel sign-in works in place ("Ituloy ang Wishlist ko" appears).
- Browser (full lifecycle): manual add Pedro Reyes/Crimson Hawk/234567+Wallet wish (6-Digit PIN column shows 234567) → lock → randomize (confirmation switch gating works, <2 participants disables the button) → release → live-session "Tingnan ang Monito/Monita ko" → gift box auto-resolve → assignment (Crimson Hawk + Wallet + ₱150–₱200 + December 20, 2026 reminder) → Log Out → wrong PIN error → correct PIN → assignment again.
- Register duplicate → shortcut button → lands on locked home sign-in.
- Mobile 390: locked home + assignment render cleanly; sticky footer intact.
- lint 0 errors; tsc clean in src/; dev.log healthy (only a stale line-1 port error from an old instance).

Stage Summary:
- There is no longer ANY way for a registered participant to get stranded: name+PIN sign-in is on the unlocked Home, the locked Home, the Wishlist page, and the Check waiting panel — and post-release a live session auto-reveals the assignment.
- Returning users land exactly where they need to be (wishlist editor pre-lock, assignment post-release), every dead-end button was given a working exit, and all rescue copy is Taglish-first.
- DB wiped clean after testing (0 participants, unlocked, not_started; admin account intact: admin / monito2026).

---
Task ID: 8
Agent: Z.ai Code (main)
Task: (a) Remove "Default credentials" ribbon on admin login; (b) change default admin credentials to admin / fafbCF2026 (incl. existing DB row); (c) rename Status-page button "Puntahan ang Check My Monito/Monita" → "Check My Monito/Monita"; (d) add a separated in-webapp Facebook Messenger GC tutorial (Taglish: intro + simplest participant procedure + FAQs) that the organizer can copy-paste.

Work Log:
- login.tsx: removed the entire "Default credentials: admin / monito2026 — palitan agad..." hint box (page now goes straight from the form to Back to Home).
- auth.ts: seed default password changed monito2026 → fafbCF2026 (ADMIN_PASSWORD env still overrides).
- DB: one-off bun script rotated the EXISTING admin row's scrypt hash to fafbCF2026 (script deleted after run; ensureSeed would not re-run on the warm server). Verified old password → 401, new → 200, and login still works after wipe.
- status.tsx: released-phase button is now "Check My Monito/Monita"; the sentence above it rephrased to "Para makita ang wishlist ng na-assign sa iyo, pindutin ang button sa ibaba!" (also fixed the "Punthan" typo).
- NEW src/components/views/gc-message.tsx: "GC Post para sa Messenger" view — Taglish announcement (short intro of the system, 3-step participant procedure, 6 FAQs) rendered as a plain-text Messenger-style preview. Copy button uses clipboard API with execCommand fallback + Taglish success/error toasts; "Paano gamitin?" card (copy → paste → pin 📌); auto-correct website link built from window.location.origin (lazy useState init to satisfy react-hooks/set-state-in-effect, no hydration risk since views render post-boot client-side); event name/budget pulled from live event (defaults ₱150–₱200) and FELLOWSHIP_DATE constant for December 20, 2026.
- app-context.ts: added "gc-message" to the View union; app.tsx: imported + routed the view (kept reachable even without the dashboard).
- dashboard.tsx: added a 7th tab "GC Post" (second position, right after Overview) rendering <GcMessageView ctx={ctx} /> — organizer-only entry point.

Verification (curl + agent-browser desktop 1280 + mobile 390):
- Admin login page: ribbon gone (snapshot confirms no hint box between form and Back to Home).
- Credentials: monito2026 → 401; fafbCF2026 → 200 (browser + curl, incl. after wipe).
- Dashboard: new tablist shows GC Post; tab renders date badge, instructions, full message preview (link auto-filled http://localhost:3000 in sandbox, event name + ₱150–₱200 interpolated), Copy button works (toast "Na-copy na ang buong message! 📋…"). Desktop + 390px mobile screenshots captured (download/gc-post-tab.png, gc-post-mobile.png).
- Button rename: ran full lifecycle via API (2 participants → wishlists → lock → randomize → release) then confirmed Status page shows "Check My Monito/Monita" which navigates to the check view; participant sign-in + gift box reveal ("Wishlist ni Violet Orchid", ₱150–₱200 reminder) still works end-to-end.
- lint: 0 errors/warnings; dev.log healthy (only deliberate 400/401 negative tests + a stale EADDRINUSE line from an old instance).
- DB wiped after testing (2 participants/2 wishlists/2 assignments deleted; event unlocked + not_started; admin account intact with fafbCF2026).

Stage Summary:
- Admin login page no longer exposes any credentials; working credentials are admin / fafbCF2026 (fresh DBs seed the same via auth.ts default; ADMIN_PASSWORD env still wins).
- All participant-facing copy now says just "Check My Monito/Monita".
- The organizer has a dedicated GC Post tab: one tap copies a ready-to-send Taglish Messenger post (intro + 3-step procedure + FAQs) with a guaranteed-correct website link, event name, and budget auto-filled from live settings.

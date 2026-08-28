<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# 🛡️ Flame-Hub Architecture & Security Guidelines (Social Platform)

## 1. Project Domain: Consumer Social Platform (Feed / Stories / Profiles)
- **Target Audience**: Pure end-user social networking experience (like Instagram / Facebook / Threads). No administrative dashboard overhead.
- **Core User Capabilities**:
  - Feed (Infinite scrolling media posts, rich captions, likes, comments, reposts/shares)
  - Stories / Fleets (Ephemeral status updates)
  - User Profiles (Bio, follower/following network, media gallery, badges)
  - Real-time Notifications & Direct Messaging
  - Explore / Discover (Trending tags, creator discovery)

---

## 2. 🔒 Fortress-Grade Security & Anti-Hacker Directives (Zero-Trust)

To keep this platform immune to penetration tests, script kiddies, and advanced web exploits, the following rules are non-negotiable:

### A. Strict Input Sanitization & XSS Defense
- **Zero Raw HTML Injection**: Never use `dangerouslySetInnerHTML` unless passed through DOMPurify with strict whitelist tags.
- **Zod Schema Validation at Every Gate**: Every Server Action, Route Handler, and Form **must** validate inbound payloads using Zod schemas (`safeParse`). Discard unknown payload fields.

### B. Anti-DDoS, Brute-Force & Rate Limiting
- **Strict Rate Limiting**: All sensitive endpoints (Auth, Post Creation, Commenting, Direct Messages, Follow actions) must enforce sliding-window or token-bucket rate limiting (e.g. Upstash Redis / IP + User Hash).
- **Fail-Closed Policy**: Automatically reject requests hitting limits with `429 Too Many Requests`.

### C. Authentication & Authorization (IDOR & Zero-Trust DB)
- **IDOR Defense**: Never trust client-supplied user IDs or roles. Always extract the authenticated user ID securely from verified server sessions/cookies (`supabase.auth.getUser()`).
- **Row-Level Security (RLS)**: Every database table (`posts`, `comments`, `likes`, `follows`, `messages`, `profiles`) **must have RLS enabled** directly in Postgres. The database itself must reject unauthorized access.

### D. Cryptographic Session & Cookie Policy
- Enforce `HttpOnly`, `Secure` (HTTPS only), and `SameSite=Lax` or `Strict` flags on all session cookies.
- Leverage Next.js Server Actions with built-in Anti-CSRF token verification.

### E. File Upload Hardening (Media & Stories)
- **MIME & Magic Byte Verification**: Server-side inspection of binary headers (magic numbers), not just file extensions.
- **Path Traversal Prevention**: Never store raw client filenames; generate cryptographic UUIDs (`crypto.randomUUID()`).
- **Strict Limits**: Max 5MB for photos (JPEG, PNG, WebP), max 25MB for short video clips (MP4, WebM).

### F. Security HTTP Response Headers (Anti-Clickjacking & CSP)
- Middleware & Next.js config must enforce strict security headers:
  - `Content-Security-Policy (CSP)` (Restricts unauthorized script & media domains)
  - `X-Frame-Options: DENY` (Anti-Clickjacking)
  - `X-Content-Type-Options: nosniff` (MIME sniffing defense)
  - `Strict-Transport-Security (HSTS)` (Forces HTTPS)
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 3. 📊 Enterprise Error Tracking, Auditing & Logging Architecture

### A. Structured Logging Standard
- Every server-side error and critical security event (Failed Logins, Rate Limit triggers, Permission Denials) must be logged as JSON structured telemetry:
  ```ts
  {
    "timestamp": "ISO_STRING",
    "level": "error" | "warn" | "info" | "security",
    "event": "AUTH_FAILED_RATE_LIMIT",
    "userId": "anon or uuid",
    "ipHash": "sha256(ip)",
    "path": "/api/...",
    "error": "Error message / stack trace"
  }
  ```
- **PII Protection**: Never log sensitive plaintext passwords, raw API tokens, or credit card info in logs.

### B. Error Boundaries & Fallbacks
- Global and route-level error boundaries (`error.tsx`, `global-error.tsx`) must catch unhandled runtime errors gracefully with user-friendly recovery UI, while piping error context to error-tracking services (e.g. Sentry / Telemetry logger).

### C. 🛡️ Mandatory Universal `try/catch` & Safe Result Pattern
- **Every Async Operation, Server Action, API Route, and DB Call MUST be enclosed in strict `try/catch` blocks.**
- **No Unhandled Promise Rejections**: Never let an unhandled error crash the server or leak raw database traces to the client.
- **Structured Return Standard (Result / Either Pattern)**:
  ```ts
  type ActionResult<T> = 
    | { success: true; data: T; error?: never }
    | { success: false; error: string; code?: string; data?: never };

  export async function createPostAction(input: unknown): Promise<ActionResult<Post>> {
    try {
      // 1. Sanitize & Validate input
      // 2. Authenticate session
      // 3. Database operation
      return { success: true, data: post };
    } catch (err) {
      logger.error("POST_CREATION_FAILED", { error: err, input });
      return { 
        success: false, 
        error: "Unable to publish your post. Please try again later.",
        code: "INTERNAL_ERROR" 
      };
    }
  }
  ```
- **Client-Side Safe Handlers**: Every client-side async action (form submits, API fetches, clipboard copy) must wrap calls in `try/catch/finally` to guarantee loading states always reset and user-friendly toast alerts (`toast.error(...)`) trigger on failures.

---

---

## 4. 📁 Feature-Driven Directory Standard

```
features/
├── feed/               # Feed algorithm, post cards, infinite scroll, likes, reactions
├── post-creation/      # Upload modal, image filters, tag mentions, server actions
├── profile/            # User profile header, follow/unfollow, media tabs
├── notifications/      # Real-time bell dropdown, push notification listener
├── direct-messages/    # Private 1-on-1 and group chat threads
└── auth/               # User onboarding, session verification, OAuth
```

## 5. 🎯 Strict Zero-`any` & Enterprise Type-Safety Directives

To maintain world-class engineering standards and prevent runtime bugs:
- **Zero Explicit `any` (`@typescript-eslint/no-explicit-any`)**:
  - Never use `any` in variable types, function parameters, returns, or type assertions (`as any`).
- **Use `unknown` for Dynamic/Inbound Payloads**:
  - When the incoming data shape is not yet validated (Server Action inputs, API bodies, JSON parse results), use `unknown` and validate via Zod schema (`Schema.safeParse(...)`) before use.
- **Strict Readonly Arrays & Const Assertions**:
  - For string lookup arrays derived from `as const` objects, use `readonly string[]` assertions instead of loosening types to `any`.
- **Generics & Discriminated Unions**:
  - Use Generic Type parameters `<T>` and Discriminated Union types instead of loose `any` shapes.

---

## 6. 🪟 Modal Architecture, Event Cleanup & Zero-Memory-Leak Directives

To prevent frontend performance degradation, zombie listeners, and browser memory leaks:
- **Clean Unmount Gate**:
  - Every modal must unmount completely from the DOM when closed (`if (!isOpen) return null`). Never leave invisible hidden DOM subtrees with active canvas/listeners running in the background.
- **Strict Backdrop Click-Outside Dismissal**:
  - The outer backdrop container (`fixed inset-0`) must always have `onClick={onClose}`.
  - The inner dialog card must stop event bubbling with `onClick={(e) => e.stopPropagation()}` to prevent accidental closures when interacting with inputs.
- **Mandatory Lifecycle Cleanup (`useEffect`)**:
  - Whenever a modal adds global listeners or modifies document styles:
    ```tsx
    React.useEffect(() => {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "unset";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [onClose]);
    ```
- **Zero Object URL Memory Leaks**:
  - Whenever `URL.createObjectURL(blob)` is generated for image preview, revoke it when cleaning up or replacing files via `URL.revokeObjectURL(url)`.

---

## 7. 📝 Post Editing, 1-Time Edit Maximum & Timestamp Integrity Directives

To maintain content transparency, combat spam, and prevent feed jumping:
- **1-Time Edit Maximum Rule (Instagram Anti-Spam Standard)**:
  - Posts can only be edited **once** in their lifetime (`isEdited: Boolean @default(false)`).
  - Once a post is edited (`isEdited === true`), the backend (`editPostAction`) **must reject** subsequent edits with `EDIT_LIMIT_REACHED`.
  - The UI (3-dots menus on feed, profile, and comment drawer) **must completely hide** the "Edit Post" option when `isEdited === true`.
  - The Edit Post modal **must display** an amber advisory notice informing the user that edits are final and single-use only.
- **Timestamp & Repost Integrity**:
  - **Preserve `repostedAt` on Edit**: Editing a post must **NEVER** wipe out or omit `repostedAt` from the return DTO; doing so causes the post to drop in feed rank and recalculate time incorrectly.
  - **Clean Relative Timestamp Badging**:
    - Un-reposted, un-edited: `3d ago`
    - Un-reposted, edited: `3d ago • Edited`
    - Reposted, edited: `Reposted 2h ago • Edited`
  - Driven directly by the dedicated `isEdited` boolean column, NOT variable `@updatedAt` clock differences.
- **In-Place Stable Card Shimmer Transition**:
  - When a user saves an edited post, render the `PostCardSkeleton` directly **inside** the stable `<motion.article key={post.id}>` container to guarantee zero key-mismatch jumping or layout physics springs.

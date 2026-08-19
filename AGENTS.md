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
- **Zod Schema Validation at Every Gate**: Every Server Action and API Route handler **must** validate inbound payload using Zod schemas (`safeParse`). Discard unknown payload fields.

### B. Anti-DDoS, Brute-Force & Rate Limiting
- **Strict Rate Limiting**: All sensitive endpoints (Auth, Post Creation, Commenting, Follow actions) must enforce sliding-window or token-bucket rate limiting (e.g. Upstash Redis / IP + User Hash).
- Fail-closed behavior on rate limits (`429 Too Many Requests`).

### C. Authentication & Authorization (IDOR Protection)
- **Insecure Direct Object Reference (IDOR) Defense**: Never trust client-supplied user IDs. Always retrieve the authenticated user's ID securely from the verified server session/cookie (JWT/Supabase Auth).
- **Row-Level Security (RLS)**: When using Supabase or SQL DB, every table (`posts`, `comments`, `likes`, `follows`, `messages`) **must have RLS enabled**. A user cannot mutate or read private rows belonging to others.

### D. CSRF & Secure Cookie Policy
- Enforce `SameSite=Lax` or `Strict`, `HttpOnly`, and `Secure` flags on all auth session cookies.
- Utilize Next.js Server Actions which inherently bundle anti-CSRF token validation.

### E. File Upload Hardening (Media/Images)
- Never store raw user-uploaded file names (prevent Directory Traversal). Generate cryptographic UUIDs (`crypto.randomUUID()`).
- Verify Magic Numbers / MIME types server-side, not just file extensions.
- Enforce strict size limits (e.g., max 5MB for photos, 25MB for videos).

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


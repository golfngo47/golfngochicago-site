import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

const TOKEN_PATH = path.join(process.cwd(), "token.json");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function loadStoredToken(): boolean {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
      const auth = getOAuth2Client();
      auth.setCredentials(token);
      return true;
    }
  } catch {
    // token unreadable
  }
  return false;
}

export function getAuthUrl(): string {
  const auth = getOAuth2Client();
  return auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function exchangeCodeForToken(code: string): Promise<void> {
  const auth = getOAuth2Client();
  const { tokens } = await auth.getToken(code);
  auth.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
}

export function isAuthenticated(): boolean {
  return fs.existsSync(TOKEN_PATH);
}

export function getAuthenticatedClient() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error("NOT_AUTHENTICATED");
  }
  const auth = getOAuth2Client();
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  auth.setCredentials(token);

  // Auto-refresh token if expired
  auth.on("tokens", (tokens) => {
    if (tokens.refresh_token) {
      const current = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
      fs.writeFileSync(
        TOKEN_PATH,
        JSON.stringify({ ...current, ...tokens })
      );
      console.log("[Gmail] Token refreshed and saved.");
    }
  });

  return auth;
}

export interface RawEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  body: string;
  snippet: string;
}

// ── Gmail search queries ────────────────────────────────────────────────────
// These are intentionally source-specific, not keyword-based.
// Keyword queries like "subject:deposit" or "subject:quote" match unrelated
// emails from banks, vendors, etc. and flood the CRM with noise.
//
// What each query captures:
//   1. JotForm   — every lead form submitted on the Golf 'n Go website
//   2. Jobber    — all Jobber system emails: quotes, approvals, deposits,
//                  invoices, and payment confirmations
//   3. Outbound  — every email Jake sends FROM his sales address to a client
//   4. Inbound   — every email a client sends TO Jake's sales address
const SEARCH_QUERIES = [
  "from:noreply@jotform.com",
  "from:getjobber.com",
  "from:sales@golfngochicago.com",
  "to:sales@golfngochicago.com",
];

/**
 * Pull the bare email address out of a Gmail header value.
 * Handles both "Display Name <addr@example.com>" and "addr@example.com".
 */
export function extractEmailAddress(headerValue: string): string {
  if (!headerValue) return "";
  const match = headerValue.match(/<([^>]+)>/);
  if (match) return match[1].trim().toLowerCase();
  // No angle brackets — the whole value is the address
  return headerValue.trim().toLowerCase();
}

function decodeBase64(data: string): string {
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return "";
  }
}

function extractBody(payload: any): string {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  if (payload.mimeType === "text/html" && payload.body?.data) {
    const html = decodeBase64(payload.body.data);
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  if (payload.parts) {
    // Prefer plain text
    const textPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
    if (textPart) return extractBody(textPart);

    const htmlPart = payload.parts.find((p: any) => p.mimeType === "text/html");
    if (htmlPart) return extractBody(htmlPart);

    // Recurse into multipart
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }

  return "";
}

function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

/** Format a Date as YYYY/MM/DD for Gmail's after: operator. */
function toGmailDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export async function fetchEmailsSince(sinceDate?: Date): Promise<RawEmail[]> {
  console.log("[Gmail] ── fetchEmailsSince called ──────────────────────");
  console.log("[Gmail] sinceDate arg received:", sinceDate ? sinceDate.toISOString() : "undefined");

  // ── Sanity-check the cursor ──────────────────────────────────────────────
  // If sinceDate is in the future, or less than 1 hour old, it means the
  // cursor was set to "now" by a previous sync that used new Date() instead
  // of the newest email's date. Treat it as null so we fall back to 90 days.
  let effectiveSinceDate = sinceDate;
  if (sinceDate) {
    const ageMs = Date.now() - sinceDate.getTime();
    const oneHourMs = 60 * 60 * 1000;
    if (ageMs < oneHourMs) {
      console.log(
        `[Gmail] ⚠ sinceDate is ${ageMs < 0 ? "in the FUTURE" : "less than 1 hour old"} (${sinceDate.toISOString()}).`
      );
      console.log("[Gmail]   This means the cursor was set to ~now, which returns 0 results.");
      console.log("[Gmail]   Ignoring sinceDate — falling back to newer_than:90d.");
      console.log("[Gmail]   To permanently fix: call POST /api/sync/reset to clear lastSyncAt.");
      effectiveSinceDate = undefined;
    } else {
      console.log(`[Gmail] sinceDate passes sanity check (age: ${Math.round(ageMs / 86400000)}d old)`);
    }
  }

  const afterQuery = effectiveSinceDate
    ? ` after:${toGmailDate(effectiveSinceDate)}`
    : " newer_than:90d";

  console.log("[Gmail] Date filter that will be appended:", afterQuery.trim());
  if (effectiveSinceDate) {
    console.log("[Gmail]   (using YYYY/MM/DD format, date =", toGmailDate(effectiveSinceDate), ")");
  }

  // Dump token expiry info without exposing secrets
  try {
    const tok = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    const expiry = tok.expiry_date ? new Date(tok.expiry_date).toISOString() : "not set";
    const hasRefresh = !!tok.refresh_token;
    console.log("[Gmail] Token expiry:", expiry, "| has refresh_token:", hasRefresh);
  } catch (e) {
    console.log("[Gmail] Could not read token details:", e);
  }

  const auth = getAuthenticatedClient();
  const gmail = google.gmail({ version: "v1", auth });

  console.log("[Gmail] Running", SEARCH_QUERIES.length, "search queries:", SEARCH_QUERIES);

  const seenIds = new Set<string>();
  const emails: RawEmail[] = [];

  for (const query of SEARCH_QUERIES) {
    const fullQuery = query + afterQuery;
    console.log(`[Gmail] ── Query: "${fullQuery}" ──`);

    try {
      const listRes = await gmail.users.messages.list({
        userId: "me",
        q: fullQuery,
        maxResults: 100,
      });

      const messages = listRes.data.messages || [];
      const resultEstimate = listRes.data.resultSizeEstimate ?? "unknown";
      console.log(`[Gmail]   → Gmail returned ${messages.length} message IDs (resultSizeEstimate: ${resultEstimate})`);

      if (messages.length === 0) {
        console.log(`[Gmail]   → No messages found for this query. Check that the query matches real emails in your inbox.`);
        continue;
      }

      let fetchedCount = 0;
      let skippedDupe = 0;
      let fetchErrors = 0;

      for (const msg of messages) {
        if (!msg.id) {
          console.log("[Gmail]   → Skipping message with no ID");
          continue;
        }
        if (seenIds.has(msg.id)) {
          skippedDupe++;
          continue;
        }
        seenIds.add(msg.id);

        try {
          const full = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "full",
          });

          const headers = full.data.payload?.headers || [];
          const body = extractBody(full.data.payload);
          const from = getHeader(headers, "from");
          const to = getHeader(headers, "to");
          const subject = getHeader(headers, "subject");
          const dateMs = parseInt(full.data.internalDate || "0");

          console.log(`[Gmail]   ✓ Fetched msg ${msg.id}: from="${from}" | subject="${subject}" | bodyLen=${body.length}`);

          if (body.length === 0) {
            console.log(`[Gmail]     ⚠ Body is empty — mimeType was: ${full.data.payload?.mimeType}`);
          }

          emails.push({
            id: msg.id,
            threadId: msg.threadId || "",
            from,
            to,
            subject,
            date: new Date(dateMs),
            body: body.slice(0, 8000),
            snippet: full.data.snippet || "",
          });

          fetchedCount++;
        } catch (e) {
          fetchErrors++;
          console.error(`[Gmail]   ✗ Failed to fetch full message ${msg.id}:`, e instanceof Error ? e.message : e);
        }
      }

      console.log(`[Gmail]   Summary: fetched=${fetchedCount}, dupes_skipped=${skippedDupe}, errors=${fetchErrors}`);
    } catch (e) {
      console.error(`[Gmail] ✗ List query FAILED for "${fullQuery}":`, e instanceof Error ? e.message : e);
      // Log the full error to help diagnose auth vs. quota vs. network issues
      if (e instanceof Error && (e as any).code) {
        console.error(`[Gmail]   HTTP status code:`, (e as any).code);
      }
    }
  }

  console.log(`[Gmail] ── Done. Total unique emails fetched: ${emails.length} ──────────`);
  return emails;
}

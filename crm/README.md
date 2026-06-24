# Golf 'n Go CRM

A self-hosted CRM for Golf 'n Go Chicago. Connects to Gmail, automatically pulls leads from JotForm submissions, Jobber quotes, deposit emails, and client reply threads — then organizes them into a searchable CRM with AI-powered summaries and status tracking.

---

## Prerequisites

You need **Node.js 18 or newer** installed.

- Download from: https://nodejs.org (click the "LTS" button)
- Install it, then restart your computer

To verify it worked, open a terminal and run:
```
node --version
```
You should see something like `v20.x.x`.

---

## Step 1 — Install dependencies

Open a terminal, navigate to the `crm` folder, and run:

```bash
npm install
```

This downloads everything the app needs (takes ~1-2 minutes first time).

---

## Step 2 — Set up Google Cloud OAuth credentials

You need to create a Google OAuth app so the CRM can read your Gmail.

1. Go to https://console.cloud.google.com
2. Click **"Select a project"** (top left) → **"New Project"**
   - Name it `GNG CRM` → click **Create**
3. In the left sidebar, go to **APIs & Services → Library**
   - Search for `Gmail API` → click it → click **Enable**
4. Go to **APIs & Services → OAuth consent screen**
   - Choose **External** → click **Create**
   - App name: `GNG CRM`
   - User support email: your Gmail address
   - Developer contact email: your Gmail address
   - Click **Save and Continue** through all steps
   - On the last step, click **Back to Dashboard**
5. Go to **APIs & Services → Credentials**
   - Click **+ Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `GNG CRM Local`
   - Under **Authorized redirect URIs**, click **Add URI** and paste:
     ```
     http://localhost:3000/api/auth/callback
     ```
   - Click **Create**
6. A popup appears with your **Client ID** and **Client Secret** — copy both

---

## Step 3 — Create your .env file

In the `crm` folder, copy `.env.example` to a new file named `.env`:

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
ANTHROPIC_API_KEY=sk-ant-...        # Your Anthropic API key (https://console.anthropic.com)
GOOGLE_CLIENT_ID=...                 # From Step 2
GOOGLE_CLIENT_SECRET=...             # From Step 2
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
DATABASE_URL=file:./dev.db
```

**Anthropic API key:** Sign up at https://console.anthropic.com and create an API key.

---

## Step 4 — Create the database

Run the database migration:

```bash
npx prisma migrate deploy
npx prisma generate
```

This creates a `dev.db` SQLite file in the `crm` folder with all the right tables.

---

## Step 5 — Start the app

```bash
npm run dev
```

Visit http://localhost:3000 in your browser.

---

## Step 6 — Connect Gmail (first time only)

When you first visit the app, you'll see a **"Connect Gmail"** banner at the top.

1. Click **Connect Gmail**
2. Your browser opens Google's login page — sign in with the Gmail account you use for Golf 'n Go
3. You may see a warning that the app is unverified — click **Advanced → Go to GNG CRM (unsafe)**
   *(This is fine — it's your own app, Google just hasn't verified it)*
4. Click **Allow**
5. You'll be redirected back to the CRM — Gmail is now connected

Your login is saved to `token.json` in the crm folder. **You never have to log in again.**

---

## Using the app

- **Refresh button** (top right) — manually triggers a Gmail sync right now
- **Auto-sync** — the app automatically syncs Gmail every hour while it's running
- **Filter tabs** — All / Urgent / Active / Confirmed / Completed / Lost
- **Click any lead card** to expand it, then use the 3 tabs:
  - **Overview** — AI summary + event details
  - **History** — Full email timeline, color-coded
  - **Contact** — Tap-to-email, tap-to-call, outreach stats

---

## Troubleshooting

**"npx is not recognized"** — Node.js isn't installed. Go to https://nodejs.org and install it.

**Gmail connect button does nothing** — Make sure your `.env` has valid `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

**"App blocked" or error on Google login** — Make sure you added `http://localhost:3000/api/auth/callback` as an authorized redirect URI (Step 2, item 5).

**No leads appearing after sync** — Check that your `ANTHROPIC_API_KEY` is valid. The app uses Claude AI to parse emails.

**Database errors** — Run `npx prisma migrate deploy && npx prisma generate` again.

---

## Daily usage

Just run `npm run dev` and leave the terminal open. The CRM syncs Gmail every hour automatically. When you're done, close the terminal.

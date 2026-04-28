# mcp-viva-engage

An open source Model Context Protocol (MCP) server that connects Claude AI to Viva Engage (Yammer). Browse your home network communities, search posts, read conversations, and post replies — all through natural conversation with Claude.

> **Built by [Pranav Joshi](https://github.com/pranav4186)**

---

## What You Can Do

Once connected, you can ask Claude things like:
- *"What Viva Engage communities do I belong to?"*
- *"Search for posts about Business Central errors"*
- *"What are the latest conversations in the Developers community?"*
- *"Reply to that thread with..."*
- *"Show me my Viva Engage feed"*

---

## Important Limitation — Home Network Only

This MCP server works with your **home network only** (the primary organization network tied to your login credentials).

**Why can't it access external networks?**

Viva Engage supports two types of networks:
- **Home network** — your primary organization (e.g. your company's Viva Engage)
- **External networks** — communities hosted by other organizations you're a guest member of (e.g. Microsoft's BC Partners community)

The Yammer REST API (`www.yammer.com/api/v1`) only returns data from your home network regardless of what parameters or tokens are used. External networks require browser session cookies that are only available after a full web-based login — something that cannot be replicated through API calls alone.

Microsoft's newer Graph API (`graph.microsoft.com`) also does not support external networks — it only works with networks in native mode within your own tenant.

This is a **Microsoft API limitation**, not a limitation of this MCP server. If Microsoft expands their API to support external networks in the future, this server can be updated to support them.

---

## How It Works

```
You ask Claude a question
        ↓
Claude calls this MCP server
        ↓
Server calls Viva Engage API using YOUR login
        ↓
Returns data only YOU can already see
        ↓
Claude answers your question
```

> **Privacy:** Every user registers their own Azure app and uses their own Microsoft credentials. No data ever goes through anyone else's infrastructure. Your login token is stored encrypted on your machine only.

---

## Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- [Claude Desktop](https://claude.ai/download)
- A Microsoft work/school account with Viva Engage access

---

## Step 1 — Register Your Own Azure App

> This is a one-time setup (~10 minutes). You register your own app under your own Microsoft account. No one else can use your app — it is tied to your credentials only.

1. Go to [portal.azure.com](https://portal.azure.com) and sign in with your **work/school Microsoft account**
2. Search for **"App registrations"** → click **"+ New registration"**
3. Fill in:
   - **Name:** `mcp-viva-engage` (or anything you like)
   - **Supported account types:** `Multiple Entra ID tenants` → select `Allow all tenants`
   - **Redirect URI:**
     - Platform = `Public client/native (mobile & desktop)`
     - URI = `http://localhost`
4. Click **"Register"**
5. On the overview page, **copy and save both of these:**
   - **Application (client) ID**
   - **Directory (tenant) ID**

### Add API Permissions

1. In the left sidebar click **"API permissions"**
2. Click **"+ Add a permission"** → click the **"All APIs"** tab → search for **"Yammer"**
3. Click **"Yammer"** → click **"Delegated permissions"**
4. Check these four permissions:
   - ✅ `user_impersonation`
   - ✅ `Community.Read.All`
   - ✅ `EngagementConversation.ReadWrite.All`
   - ✅ `Storyline.ReadWrite.All`
5. Click **"Add permissions"**

> **Note for work/school accounts:** Your organization's IT admin may need to grant consent for this app before you can log in for the first time. This is a one-time step. You can submit an approval request directly from the login screen when you first run the server.

---

## Step 2 — Clone and Build

```bash
# Clone the repo
git clone https://github.com/pranav4186/mcp-viva-engage.git
cd mcp-viva-engage

# Install dependencies
npm install

# Build
npm run build
```

---

## Step 3 — Configure Your Credentials

Copy the example env file:

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Open `.env` and fill in your values from Step 1:

```
AZURE_CLIENT_ID=your-application-client-id-here
AZURE_TENANT_ID=your-directory-tenant-id-here
```

> **Important:** Never commit your `.env` file to GitHub. It is already in `.gitignore` to prevent this.

---

## Step 4 — Connect to Claude Desktop

Open your Claude Desktop config file:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the viva-engage server to the `mcpServers` section:

```json
{
  "mcpServers": {
    "viva-engage-mcp": {
      "command": "node",
      "args": ["C:/path/to/mcp-viva-engage/dist/server.js"],
      "env": {
        "AZURE_CLIENT_ID": "your-application-client-id-here",
        "AZURE_TENANT_ID": "your-directory-tenant-id-here"
      }
    }
  }
}
```

> **Replace** `C:/path/to/mcp-viva-engage` with the actual path where you cloned the repo.
> **Windows paths** can use forward slashes `/` or double backslashes `\\`.

Fully **quit and restart** Claude Desktop after saving.

---

## Step 5 — First Login

The first time you ask Claude something about Viva Engage:

1. A **browser window automatically opens** with Microsoft's login page
2. Sign in with your **work/school Microsoft account**
3. Approve the permissions
4. Browser shows **"Login successful!"**
5. Claude completes your request

> Your session is kept encrypted on your machine. When you restart Claude Desktop you may need to log in again.

---

## Available Tools

| Tool | Description |
|---|---|
| `get_networks` | Get all Viva Engage networks you belong to |
| `get_communities` | List all communities in your home network |
| `get_community_by_id` | Get details of a specific community by ID |
| `get_community_messages` | Get all posts in a specific community |
| `get_thread` | Get all messages in a conversation thread |
| `search_messages` | Search posts across your home network |
| `post_message` | Post a new message to a community |
| `reply_to_message` | Reply to an existing conversation thread |
| `get_storyline_feed` | Get your personal Viva Engage storyline feed |

---

## Security & Privacy

| | |
|---|---|
| 🔐 **Your own Azure app** | Every user registers their own app — no shared infrastructure |
| 🔐 **Your own credentials** | You log in with your own Microsoft account |
| 🔐 **Encrypted token storage** | Token is encrypted using Windows DPAPI (or plain file on Mac/Linux) |
| 🔐 **No secrets in code** | Client ID and Tenant ID stay in your local `.env` file only |
| 🔐 **Delegated permissions** | Server can only see what you can already see in Viva Engage |
| 🔐 **Password never touched** | Microsoft handles authentication entirely |

---

## Project Structure

```
mcp-viva-engage/
├── src/
│   ├── auth/
│   │   └── auth.ts          # Microsoft OAuth login with DPAPI encrypted cache
│   ├── yammerClient.ts      # Viva Engage / Yammer API client
│   └── server.ts            # MCP server and tool definitions
├── .env.example             # Template — copy to .env and fill in your values
├── .gitignore               # Prevents .env from being committed
├── package.json
├── tsconfig.json
└── README.md
```

---

## Troubleshooting

**"Approval required" on first login**
> Your organization requires admin consent for new apps. Ask your IT admin to approve the app in Azure portal → Enterprise Applications → find `mcp-viva-engage` → Grant admin consent. This is a one-time action.

**Server not showing in Claude Desktop**
> Fully quit and restart Claude Desktop after editing the config file. Verify the path to `dist/server.js` is correct.

**Login required again after restart**
> The encrypted token may have expired. Simply log in again — the session will be cached after login.

**Only seeing home network communities**
> This is expected — see the [Important Limitation](#important-limitation--home-network-only) section above. The Yammer REST API only supports home network access.

**Path issues on Windows**
> Use either forward slashes `C:/path/to/dist/server.js` or double backslashes `C:\\path\\to\\dist\\server.js` in the config file.

---

## Known Limitations

- **Home network only** — External networks (e.g. Microsoft BC Partners community) are not accessible via any public Microsoft API. See explanation above.
- **Rate limiting** — Yammer API allows 10 requests per user per app per 30 seconds.
- **Read-only search** — Search results are limited to what Viva Engage indexes.

---

## Roadmap

- [ ] Convert to a remote connector so users don't need local setup
- [ ] Add pagination support for large community feeds
- [ ] Windows Credential Manager support for even more secure token storage
- [ ] Support external networks if Microsoft adds API support in future

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Disclaimer

This is an independent open source project and is not affiliated with, endorsed by, or supported by Microsoft or Viva Engage. Use at your own risk.
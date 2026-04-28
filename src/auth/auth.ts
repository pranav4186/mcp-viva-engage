import * as msal from "@azure/msal-node";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CLIENT_ID = process.env.AZURE_CLIENT_ID || "";
const TENANT_ID = process.env.AZURE_TENANT_ID || "";
const SCOPES = ["https://api.yammer.com/user_impersonation"];

// Token cache directory
const TOKEN_DIR = path.join(os.homedir(), ".mcp-viva-engage");
const TOKEN_FILE = path.join(TOKEN_DIR, "token_cache.bin");

// ─── DPAPI ENCRYPTION ────────────────────────────────────

async function encryptData(data: string): Promise<Buffer> {
  try {
    const dpapi = await import("@primno/dpapi");
    if (dpapi.isPlatformSupported) {
      const encrypted = dpapi.Dpapi.protectData(
        Buffer.from(data, "utf-8") as unknown as Uint8Array,
        null,
        "CurrentUser"
      );
      return Buffer.from(encrypted);
    }
  } catch {
    // DPAPI not available — fall back to plain text
  }
  return Buffer.from(data, "utf-8");
}

async function decryptData(data: Buffer): Promise<string> {
  try {
    const dpapi = await import("@primno/dpapi");
    if (dpapi.isPlatformSupported) {
      const decrypted = dpapi.Dpapi.unprotectData(
        data as unknown as Uint8Array,
        null,
        "CurrentUser"
      );
      return Buffer.from(decrypted).toString("utf-8");
    }
  } catch {
    // DPAPI not available — fall back to plain text
  }
  return data.toString("utf-8");
}

// ─── CACHE PLUGIN ────────────────────────────────────────

const cachePlugin: msal.ICachePlugin = {
  beforeCacheAccess: async (cacheContext) => {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        const encrypted = fs.readFileSync(TOKEN_FILE);
        const decrypted = await decryptData(encrypted);
        cacheContext.tokenCache.deserialize(decrypted);
      }
    } catch {
      // If decryption fails start fresh
    }
  },
  afterCacheAccess: async (cacheContext) => {
    try {
      if (cacheContext.cacheHasChanged) {
        if (!fs.existsSync(TOKEN_DIR)) {
          fs.mkdirSync(TOKEN_DIR, { recursive: true });
        }
        const serialized = cacheContext.tokenCache.serialize();
        const encrypted = await encryptData(serialized);
        fs.writeFileSync(TOKEN_FILE, encrypted);
      }
    } catch {
      // If encryption fails don't crash the server
    }
  },
};

// ─── MSAL CLIENT ─────────────────────────────────────────

const pca = new msal.PublicClientApplication({
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
  },
  cache: {
    cachePlugin,
  },
  system: {
    loggerOptions: {
      loggerCallback: () => {},
      piiLoggingEnabled: false,
      logLevel: msal.LogLevel.Error,
    },
  },
});

// ─── TOKEN ACQUISITION ───────────────────────────────────

export async function getAccessToken(): Promise<string> {
  // Try silent first from cache
  const accounts = await pca.getTokenCache().getAllAccounts();
  if (accounts.length > 0) {
    try {
      const silent = await pca.acquireTokenSilent({
        scopes: SCOPES,
        account: accounts[0],
      });
      if (silent?.accessToken) return silent.accessToken;
    } catch {
      // Fall through to interactive
    }
  }

  // Interactive browser login
  const response = await pca.acquireTokenInteractive({
    scopes: SCOPES,
    openBrowser: async (url) => {
      const { exec } = await import("child_process");
      exec(`start "" "${url}"`);
    },
    successTemplate: "<h1>Login successful! You can close this window.</h1>",
    errorTemplate: "<h1>Login failed. Please try again.</h1>",
  });

  if (!response?.accessToken) {
    throw new Error("Failed to get access token");
  }

  return response.accessToken;
}

export function clearTokens(): void {
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
  }
}
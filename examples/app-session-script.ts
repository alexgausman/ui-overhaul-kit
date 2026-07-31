/**
 * REFERENCE IMPLEMENTATION — TV Gaus's session-mint script, included so you can
 * imitate the pattern. It imports that app's own auth modules, so it will not
 * compile in your project as-is; write your app's version against your session
 * machinery and wire it as `auth.command` in your harness app config.
 *
 * Mints a short-lived owner session for the UI observation harness so a headless
 * browser on this server can see the app past the default-deny auth check.
 *
 * This is deliberately *not* an auth bypass. It reuses the ordinary session
 * machinery (signed token + `auth_sessions` row), so the app validates a harness
 * session exactly like a login-issued one, and revoking it works the same way.
 * The only differences are that it is created from a local terminal instead of a
 * password POST, and that it expires in hours rather than 30 days.
 *
 * The token is written to a gitignored mode-600 file, never printed.
 *
 *   npm run ui:session                # mint (default 12h)
 *   npm run ui:session -- --hours 2   # shorter
 *   npm run ui:session -- --revoke    # revoke the stored session and delete it
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { closeSqlite } from "../src/server/db/connection";
import { getDataDir } from "../src/server/db/paths";
import { AUTH_COOKIE_NAME } from "../src/server/auth/constants";
import { createSession, revokeSession } from "../src/server/auth/sessions";

type StoredSession = {
  cookieName: string;
  value: string;
  expiresAt: string;
  createdAt: string;
  note: string;
};

loadEnvFile(path.join(process.cwd(), ".env"));

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const hours = numberFlag(args, "--hours") ?? 12;
const sessionPath = path.join(getDataDir(), "runtime", "harness-session.json");

try {
  if (revoke) {
    const stored = readStored(sessionPath);
    if (!stored) {
      console.log("No stored harness session.");
    } else {
      revokeSession(stored.value);
      rmSync(sessionPath, { force: true });
      console.log(`Revoked harness session and removed ${relative(sessionPath)}`);
    }
  } else {
    const previous = readStored(sessionPath);
    if (previous) {
      // One harness session at a time: leaving orphans around would defeat the
      // point of keeping this credential short-lived and revocable.
      revokeSession(previous.value);
    }

    const session = createSession(new Date(), Math.round(hours * 3600));
    const stored: StoredSession = {
      cookieName: AUTH_COOKIE_NAME,
      value: session.token,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      note: "UI observation harness session. Loopback use only. Revoke with: npm run ui:session -- --revoke"
    };

    mkdirSync(path.dirname(sessionPath), { recursive: true });
    writeFileSync(sessionPath, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 });
    chmodSync(sessionPath, 0o600);

    console.log(`Harness session written to ${relative(sessionPath)}`);
    console.log(`Expires ${stored.expiresAt} (${hours}h)`);
  }
} finally {
  closeSqlite();
}

function readStored(file: string): StoredSession | null {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as StoredSession;
  } catch {
    return null;
  }
}

function numberFlag(argv: string[], flag: string) {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  const value = Number.parseFloat(argv[index + 1] ?? "");
  return Number.isFinite(value) && value > 0 ? value : null;
}

function relative(file: string) {
  return path.relative(process.cwd(), file) || file;
}

/**
 * The sync scripts are normally run after `set -a; source .env`. The harness is
 * meant to be one command, so read the same file directly without overriding
 * anything already exported.
 */
function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Authenticated harness sessions are a real credential, so the harness refuses
 * to attach one to anything but a loopback origin. A misconfigured baseUrl must
 * fail loudly rather than quietly send the owner's session to a public host.
 */
export function assertLoopback(baseUrl) {
  const url = new URL(baseUrl);
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(
      `Refusing to use an authenticated session against non-loopback host "${url.hostname}". ` +
        `Run the harness against the local instance, or set auth: null in the app config.`
    );
  }
  return url;
}

/**
 * Resolves the app's auth recipe into Playwright cookies.
 *
 * Recipe shape (all optional):
 *   { command: [bin, ...args], cwd, file, cookies: async () => [...] }
 *
 * `command` runs first (e.g. the app's own "mint a harness session" script),
 * then `file` is read as JSON describing the cookie. Apps that authenticate
 * differently can supply `cookies()` and ignore both.
 */
export async function resolveAuth(config) {
  if (!config.auth) return { cookies: [], source: "none" };

  const url = assertLoopback(config.baseUrl);

  if (config.auth.command) {
    const [bin, ...args] = config.auth.command;
    execFileSync(bin, args, {
      cwd: config.auth.cwd ?? process.cwd(),
      stdio: "pipe"
    });
  }

  if (typeof config.auth.cookies === "function") {
    return { cookies: await config.auth.cookies(url), source: "callback" };
  }

  if (config.auth.file) {
    const stored = JSON.parse(readFileSync(config.auth.file, "utf8"));
    if (!stored.value) {
      throw new Error(`Auth file ${config.auth.file} has no cookie value.`);
    }
    return {
      source: config.auth.file,
      expiresAt: stored.expiresAt ?? null,
      cookies: [
        {
          name: stored.cookieName,
          value: stored.value,
          domain: url.hostname,
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax"
        }
      ]
    };
  }

  return { cookies: [], source: "none" };
}

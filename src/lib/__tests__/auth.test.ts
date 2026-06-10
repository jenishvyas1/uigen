// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieSet = vi.fn();
const mockCookieStore = { set: mockCookieSet };
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  beforeEach(() => {
    mockCookieSet.mockClear();
  });

  test("sets auth-token cookie", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");

    expect(mockCookieSet).toHaveBeenCalledOnce();
    const [cookieName] = mockCookieSet.mock.calls[0];
    expect(cookieName).toBe("auth-token");
  });

  test("cookie has correct security options", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");

    const [, , options] = mockCookieSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie expires in approximately 7 days", async () => {
    const before = Date.now();
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const [, , options] = mockCookieSet.mock.calls[0];
    const expiresMs = options.expires.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs);
  });

  test("JWT payload contains userId and email", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-42", "test@test.com");

    const [, token] = mockCookieSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("test@test.com");
  });

  test("JWT uses HS256 algorithm", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");

    const [, token] = mockCookieSet.mock.calls[0];
    const headerB64 = token.split(".")[0];
    const header = JSON.parse(atob(headerB64));

    expect(header.alg).toBe("HS256");
  });

  test("JWT expiration is set to 7 days", async () => {
    const before = Math.floor(Date.now() / 1000);
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");
    const after = Math.floor(Date.now() / 1000);

    const [, token] = mockCookieSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const sevenDaysSec = 7 * 24 * 60 * 60;
    expect(payload.exp).toBeGreaterThanOrEqual(before + sevenDaysSec);
    expect(payload.exp).toBeLessThanOrEqual(after + sevenDaysSec);
  });

  test("different users get distinct tokens", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "a@example.com");
    await createSession("user-2", "b@example.com");

    const [, tokenA] = mockCookieSet.mock.calls[0];
    const [, tokenB] = mockCookieSet.mock.calls[1];

    expect(tokenA).not.toBe(tokenB);
  });
});

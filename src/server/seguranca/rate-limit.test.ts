import { describe, expect, it, beforeEach } from "vitest";
import { permitirRateLimit, _resetRateLimitParaTestes } from "./rate-limit";
import { igualComTempoConstante, tokenDoCookieAdmin } from "./crypto-admin";

describe("rate-limit", () => {
  beforeEach(() => _resetRateLimitParaTestes());

  it("permite até o máximo e depois bloqueia", () => {
    expect(permitirRateLimit("a", { max: 2, janelaMs: 60_000 })).toBe(true);
    expect(permitirRateLimit("a", { max: 2, janelaMs: 60_000 })).toBe(true);
    expect(permitirRateLimit("a", { max: 2, janelaMs: 60_000 })).toBe(false);
  });

  it("chaves isoladas", () => {
    expect(permitirRateLimit("x", { max: 1, janelaMs: 60_000 })).toBe(true);
    expect(permitirRateLimit("y", { max: 1, janelaMs: 60_000 })).toBe(true);
  });
});

describe("crypto-admin", () => {
  it("token estável e diferente do secret", () => {
    const t = tokenDoCookieAdmin("segredo");
    expect(t).toHaveLength(64);
    expect(t).not.toBe("segredo");
    expect(tokenDoCookieAdmin("segredo")).toBe(t);
  });

  it("igualComTempoConstante", () => {
    expect(igualComTempoConstante("abc", "abc")).toBe(true);
    expect(igualComTempoConstante("abc", "abd")).toBe(false);
    expect(igualComTempoConstante("a", "aa")).toBe(false);
  });
});

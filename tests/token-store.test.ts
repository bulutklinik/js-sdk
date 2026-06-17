import { describe, expect, it } from "vitest";
import { MemoryTokenStore } from "../src/index";

describe("MemoryTokenStore", () => {
  it("seeds, sets and clears tokens", () => {
    const store = new MemoryTokenStore({ accessToken: "a", refreshToken: "r" });
    expect(store.getAccessToken()).toBe("a");
    expect(store.getRefreshToken()).toBe("r");

    store.setTokens("a2", "r2");
    expect(store.getAccessToken()).toBe("a2");
    expect(store.getRefreshToken()).toBe("r2");

    store.clear();
    expect(store.getAccessToken()).toBeNull();
    expect(store.getRefreshToken()).toBeNull();
  });

  it("defaults to null when unseeded", () => {
    const store = new MemoryTokenStore();
    expect(store.getAccessToken()).toBeNull();
    expect(store.getRefreshToken()).toBeNull();
  });
});

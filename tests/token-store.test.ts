import { describe, expect, it } from "vitest";
import { MemoryTokenStore } from "../src/index";

describe("MemoryTokenStore", () => {
  it("seeds, sets and clears the partner token", () => {
    const store = new MemoryTokenStore("a");
    expect(store.getToken()).toBe("a");

    store.setToken("b");
    expect(store.getToken()).toBe("b");

    store.clear();
    expect(store.getToken()).toBeNull();
  });

  it("defaults to null when unseeded", () => {
    expect(new MemoryTokenStore().getToken()).toBeNull();
  });

  it("accepts an explicit null unset", () => {
    const store = new MemoryTokenStore("a");
    store.setToken(null);
    expect(store.getToken()).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { BulutklinikClient, MemoryTokenStore } from "../src/index";
import { authHeader, bodyOf, jsonResponse, makeFetch } from "./helpers";

describe("skin + meals", () => {
  it("skin.analyze posts images to /patients/imageCheck with a bearer token", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({
        resultType: 0,
        data: { status: [{ id: 1, label: "nevus", comment: "…", case_detail: "blob" }] },
      }),
    );
    const client = new BulutklinikClient({
      environment: "test",
      fetch: fetchImpl,
      tokenStore: new MemoryTokenStore({ accessToken: "abc" }),
    });

    const res = await client.skin.analyze([{ image: "BASE64", branch_id: 42 }]);

    expect(res.status[0]!.label).toBe("nevus");
    expect(calls[0]!.url).toBe("https://apitest.bulutklinik.com/api/v3/patients/imageCheck");
    expect(calls[0]!.init.method).toBe("POST");
    expect(authHeader(calls[0]!)).toBe("Bearer abc");
    expect(bodyOf(calls[0]!)).toEqual({ images: [{ image: "BASE64", branch_id: 42 }] });
  });

  it("meals.analyze maps camelCase input to the snake_case body", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({ resultType: 0, data: { status: { comment: "{}" } } }),
    );
    const client = new BulutklinikClient({
      environment: "test",
      fetch: fetchImpl,
      tokenStore: new MemoryTokenStore({ accessToken: "abc" }),
    });

    await client.meals.analyze({
      image: "BASE64",
      portionSize: "custom",
      portionGrams: 300,
      mealType: "lunch",
      note: "az yağlı",
    });

    expect(calls[0]!.url).toBe("https://apitest.bulutklinik.com/api/v3/patients/imageAnalyzeMeal");
    expect(bodyOf(calls[0]!)).toEqual({
      image: "BASE64",
      portion_size: "custom",
      meal_type: "lunch",
      portion_grams: 300,
      note: "az yağlı",
    });
  });

  it("meals.analyze omits optional fields when not provided", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({ resultType: 0, data: { status: { comment: "{}" } } }),
    );
    const client = new BulutklinikClient({
      environment: "test",
      fetch: fetchImpl,
      tokenStore: new MemoryTokenStore({ accessToken: "abc" }),
    });

    await client.meals.analyze({ image: "BASE64", portionSize: "medium", mealType: "snack" });

    expect(bodyOf(calls[0]!)).toEqual({
      image: "BASE64",
      portion_size: "medium",
      meal_type: "snack",
    });
  });
});

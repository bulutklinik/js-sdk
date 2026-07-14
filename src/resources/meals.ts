import type { HttpClient } from "../http";
import type { MealAnalysisInput, MealAnalysisResult } from "../models";

/** AI meal-photo calorie/nutrition estimation (sibling of `skin`). */
export class MealsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Estimate calories and nutrition from a meal photo. Idiomatic input names map
   * to the API's snake_case body (`portion_size`, `portion_grams`, `meal_type`).
   */
  analyze(input: MealAnalysisInput): Promise<MealAnalysisResult> {
    return this.http.request<MealAnalysisResult>({
      method: "POST",
      path: "/patients/imageAnalyzeMeal",
      auth: "bearer",
      body: {
        image: input.image,
        portion_size: input.portionSize,
        meal_type: input.mealType,
        ...(input.portionGrams !== undefined ? { portion_grams: input.portionGrams } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
    });
  }
}

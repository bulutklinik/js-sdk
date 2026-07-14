import type { HttpClient } from "../http";
import type { SkinAnalysisResult, SkinImage } from "../models";

/** "Cildimde Neyim Var" — AI skin-lesion analysis. */
export class SkinResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Analyze one or more skin photos. Each image is classified (lesion `label`),
   * summarized in Turkish (`comment`), and returned with quality flags, a
   * `confidence`, possible ICD hints and an opaque `case_detail` blob. The
   * `case_detail` may be forwarded verbatim as a payment's `caseDetail`.
   */
  analyze(images: SkinImage[]): Promise<SkinAnalysisResult> {
    return this.http.request<SkinAnalysisResult>({
      method: "POST",
      path: "/patients/imageCheck",
      auth: "bearer",
      body: { images },
    });
  }
}

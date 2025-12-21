import { Type } from "@google/genai";
import { DocumentVerification, Language } from "../types";
import { aiImage } from "./aiGateway";

export const analyzeDocument = async (
  file: File,
  type: DocumentVerification["type"],
  lang: Language = "ru"
): Promise<DocumentVerification> => {
  try {
    // Demo mode fallback when key is missing (aiImage returns null)
    const demoFallback = () =>
      new Promise<DocumentVerification>((resolve) => {
        setTimeout(() => {
          resolve({
            type,
            status: "verified",
            aiConfidence: 99,
            aiNotes:
              lang === "ru"
                ? "Тестовый режим: Документ валиден."
                : "Test Mode: Document is valid.",
            verifiedAt: Date.now(),
            documentNumber: "TEST-12345",
            expiryDate: "12/2030",
          });
        }, 1000);
      });

    const prompt = `Analyze this image. It is submitted as a ${type}.
1. Check if it looks like a valid official document (passport, id card, medical record, etc).
2. Extract the document number and expiry date if visible/applicable.
3. Provide a short verification note in ${lang === "ru" ? "Russian" : "English"} explaining your decision.

Return JSON with:
- status: 'verified' (if it looks real) or 'rejected' (if blurred, fake, or wrong doc type)
- confidence: integer 0-100
- notes: string
- docNumber: string or null
- expiry: string or null`;

    const responseText = await aiImage(file, prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["verified", "rejected"] },
          confidence: {
            type: Type.INTEGER,
            description: "Confidence score 0-100",
          },
          notes: { type: Type.STRING },
          docNumber: { type: Type.STRING, nullable: true },
          expiry: { type: Type.STRING, nullable: true },
        },
        required: ["status", "confidence", "notes"],
      },
    });

    if (!responseText) {
      console.warn("GEMINI_API_KEY missing, using mock verification.");
      return await demoFallback();
    }

    const result = JSON.parse(responseText || "{}") as any;

    return {
      type,
      status: result.status === "verified" ? "verified" : "rejected",
      aiConfidence: result.confidence || 0,
      aiNotes:
        result.notes || (lang === "ru" ? "Ошибка анализа" : "Analysis error"),
      verifiedAt: Date.now(),
      documentNumber: result.docNumber || undefined,
      expiryDate: result.expiry || undefined,
    };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    // Fallback on error to rejected to avoid broken UI
    return {
      type,
      status: "rejected",
      aiConfidence: 0,
      aiNotes:
        lang === "ru"
          ? "Не удалось обработать изображение. Попробуйте еще раз."
          : "Failed to process image. Please try again.",
      verifiedAt: Date.now(),
    };
  }
};

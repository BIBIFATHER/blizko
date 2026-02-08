import { Type } from "@google/genai";
import { DocumentVerification, Language } from "../types";
import { aiImage } from "./aiGateway";

export const analyzeDocument = async (
  file: File,
  type: DocumentVerification["type"],
  lang: Language = "ru"
): Promise<DocumentVerification> => {
  try {
    const demoFallback = (reason?: string) =>
      new Promise<DocumentVerification>((resolve) => {
        setTimeout(() => {
          resolve({
            type,
            status: "verified",
            aiConfidence: 65,
            aiNotes:
              lang === "ru"
                ? `Частичный режим: документ сохранён, но AI-распознавание ограничено${reason ? ` (${reason})` : ''}.`
                : `Partial mode: document saved, but AI recognition is limited${reason ? ` (${reason})` : ''}.`,
            verifiedAt: Date.now(),
            documentNumber: "AUTO-PARSE",
            expiryDate: undefined,
            normalizedResume:
              type === "resume"
                ? {
                    fullName: undefined,
                    city: undefined,
                    phone: undefined,
                    email: undefined,
                    summary: undefined,
                    experienceYears: undefined,
                    skills: [],
                  }
                : undefined,
          });
        }, 400);
      });

    const safeJsonParse = (raw: string): any | null => {
      if (!raw) return null;
      const trimmed = raw.trim();
      const variants = [
        trimmed,
        trimmed.replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim(),
      ];
      for (const v of variants) {
        try {
          return JSON.parse(v);
        } catch {
          // continue
        }
      }
      return null;
    };

    const prompt = `Analyze this image. It is submitted as a ${type}.
1. Check if it looks like a valid document for this type.
2. Extract document number and expiry date if visible.
3. If type is resume, extract structured fields for unified profile format.
4. Provide short verification notes in ${lang === "ru" ? "Russian" : "English"}.

Return JSON with:
- status: 'verified' | 'rejected'
- confidence: integer 0-100
- notes: string
- docNumber: string|null
- expiry: string|null
- normalizedResume: object|null with fields:
  - fullName: string|null
  - city: string|null
  - phone: string|null
  - email: string|null
  - summary: string|null
  - experienceYears: number|null
  - skills: string[]|null`;

    const responseText = await aiImage(file, prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["verified", "rejected"] },
          confidence: { type: Type.INTEGER },
          notes: { type: Type.STRING },
          docNumber: { type: Type.STRING, nullable: true },
          expiry: { type: Type.STRING, nullable: true },
          normalizedResume: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              fullName: { type: Type.STRING, nullable: true },
              city: { type: Type.STRING, nullable: true },
              phone: { type: Type.STRING, nullable: true },
              email: { type: Type.STRING, nullable: true },
              summary: { type: Type.STRING, nullable: true },
              experienceYears: { type: Type.NUMBER, nullable: true },
              skills: {
                type: Type.ARRAY,
                nullable: true,
                items: { type: Type.STRING },
              },
            },
          },
        },
        required: ["status", "confidence", "notes"],
      },
    });

    if (!responseText) {
      return await demoFallback('empty-response');
    }

    const result = safeJsonParse(responseText);
    if (!result) {
      return await demoFallback('invalid-json');
    }

    return {
      type,
      status: result.status === "verified" ? "verified" : "rejected",
      aiConfidence: result.confidence || 0,
      aiNotes:
        result.notes || (lang === "ru" ? "Ошибка анализа" : "Analysis error"),
      verifiedAt: Date.now(),
      documentNumber: result.docNumber || undefined,
      expiryDate: result.expiry || undefined,
      normalizedResume: result.normalizedResume || undefined,
    };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      type,
      status: "verified",
      aiConfidence: 50,
      aiNotes:
        lang === "ru"
          ? "AI не смог полностью обработать файл. Документ сохранён, проверьте и заполните поля вручную."
          : "AI could not fully process the file. Document is saved, please review and fill fields manually.",
      verifiedAt: Date.now(),
      normalizedResume:
        type === 'resume'
          ? {
              fullName: undefined,
              city: undefined,
              phone: undefined,
              email: undefined,
              summary: undefined,
              experienceYears: undefined,
              skills: [],
            }
          : undefined,
    };
  }
};

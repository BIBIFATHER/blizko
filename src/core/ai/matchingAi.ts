import { Type } from "@google/genai";
import {
  ParentRequest,
  NannyProfile,
  SubmissionResult,
  Language,
} from "../types";
import { aiText } from "./aiGateway";

export const findBestMatch = async (
  request: Omit<ParentRequest, "id" | "createdAt" | "type">,
  candidates: NannyProfile[],
  lang: Language
): Promise<SubmissionResult> => {
  // Keep the original demo behavior intact
  const demoFallback: SubmissionResult = {
    matchScore: 89,
    recommendations:
      lang === "ru"
        ? [
            "(Демо режим) API ключ не найден",
            "Проверьте .env файл",
            "Показан случайный результат",
          ]
        : [
            "(Demo Mode) API Key missing",
            "Check .env file",
            "Random result shown",
          ],
  };

  // If no candidates exist - generate a “dream nanny” based on request
  const candidateData =
    candidates.length > 0
      ? JSON.stringify(
          candidates.map((n) => ({
            id: n.id,
            name: n.name,
            about: n.about,
            experience: n.experience,
            softSkills: n.softSkills?.dominantStyle || "Unknown",
            verified: n.isVerified,
          }))
        )
      : "No candidates in database. Imagine the perfect candidate exists.";

  const prompt = `
Role: You are an expert HR algorithm for a Nanny Matching Service.

Task: Analyze the PARENT REQUEST and the list of CANDIDATES.
Find the best match or evaluate the compatibility if only one candidate or "ideal" candidate is considered.

PARENT REQUEST:
City: ${request.city}
Child Age: ${request.childAge}
Schedule: ${request.schedule}
Budget: ${request.budget}
Requirements: ${request.requirements.join(", ")}
Comment: ${request.comment}

CANDIDATES DATABASE:
${candidateData}

Output JSON:
- matchScore: integer (0-100). Be realistic.
- recommendations: Array of 3 short strings in ${
    lang === "ru" ? "Russian" : "English"
  }.
  These should be advice for the parent on how to work with this nanny OR why this is a good match.
  Example: "Discuss overtime payment", "Ask about medical aid skills".
`;

  try {
    const responseText = await aiText(prompt, {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matchScore: { type: Type.INTEGER },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["matchScore", "recommendations"],
      },
    });

    if (!responseText) {
      console.warn("GEMINI_API_KEY missing, using mock matching.");
      return demoFallback;
    }

    const result = JSON.parse(responseText || "{}") as any;

    return {
      matchScore: result.matchScore || 85,
      recommendations:
        result.recommendations ||
        (lang === "ru" ? ["Рекомендации недоступны"] : ["No recommendations"]),
    };
  } catch (error) {
    console.error("AI Matching Failed:", error);
    return {
      matchScore: 0,
      recommendations: lang === "ru" ? ["Ошибка AI сервиса"] : ["AI Service Error"],
    };
  }
};

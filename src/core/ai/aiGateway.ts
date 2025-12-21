import { GoogleGenAI } from "@google/genai";
import {
  GEMINI_TEXT_MODEL,
  GEMINI_IMAGE_MODEL,
  getGeminiApiKey,
} from "./aiConfig";

export type AiTextOptions = {
  systemPrompt?: string;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: unknown;
};

export type AiImageOptions = {
  systemPrompt?: string;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: unknown;
};

function getClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

/**
 * Text generation helper.
 * Returns model text or null when API key is missing.
 */
export async function aiText(
  userPrompt: string,
  opts: AiTextOptions = {}
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const response = await client.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: opts.systemPrompt,
      temperature: typeof opts.temperature === "number" ? opts.temperature : 0.7,
      ...(opts.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
      ...(opts.responseSchema ? { responseSchema: opts.responseSchema } : {}),
    },
  });

  const text = (response as any)?.text as string | undefined;
  return text && text.trim() ? text.trim() : null;
}

/**
 * Image + text generation helper.
 * Returns model text or null when API key is missing.
 */
export async function aiImage(
  file: File,
  userPrompt: string,
  opts: AiImageOptions = {}
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const base64Data = await fileToBase64(file);

  const response = await client.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: userPrompt },
          { inlineData: { mimeType: file.type || "image/jpeg", data: base64Data } },
        ],
      },
    ],
    config: {
      systemInstruction: opts.systemPrompt,
      temperature: typeof opts.temperature === "number" ? opts.temperature : 0.3,
      ...(opts.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
      ...(opts.responseSchema ? { responseSchema: opts.responseSchema } : {}),
    },
  });

  const text = (response as any)?.text as string | undefined;
  return text && text.trim() ? text.trim() : null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

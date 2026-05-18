import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchingRequest, RankedCandidate } from "./matchingAi.types";

const { aiText, formatInsightsBlock } = vi.hoisted(() => ({
  aiText: vi.fn(),
  formatInsightsBlock: vi.fn(),
}));

vi.mock("./aiGateway", () => ({
  aiText,
}));

vi.mock("./insightsLoader", () => ({
  formatInsightsBlock,
}));

import { getAiMatchSummary } from "./matchingAiPrompt";

function createRequest(overrides: Partial<MatchingRequest> = {}): MatchingRequest {
  return {
    city: "Москва",
    district: "Хамовники",
    metro: "Парк Культуры",
    childAge: "3 года",
    schedule: "5/2",
    budget: "1500 ₽/час",
    requirements: ["английский"],
    comment: "Ищем няню",
    riskProfile: {},
    ...overrides,
  };
}

function createRankedCandidate(id: string, score: number): RankedCandidate {
  return {
    nanny: {
      id,
      type: "nanny",
      name: `Nanny ${id}`,
      city: "Москва",
      experience: "5 лет",
      childAges: ["3 года"],
      skills: ["английский"],
      about: "Спокойная няня",
      contact: "+77001234567",
      isVerified: true,
      createdAt: Date.now(),
    },
    score,
    reasons: ["Есть релевантный опыт"],
    riskFlags: [],
    factors: { quality: 10 },
  };
}

describe("getAiMatchSummary", () => {
  beforeEach(() => {
    aiText.mockReset();
    formatInsightsBlock.mockReset();
    formatInsightsBlock.mockResolvedValue("INSIGHTS");
  });

  it("returns fallback when ai returns empty payload", async () => {
    aiText.mockResolvedValue("");

    const fallback = {
      matchScore: 81,
      recommendations: ["one", "two", "three"],
    };

    await expect(
      getAiMatchSummary(createRequest(), [createRankedCandidate("nanny-1", 88)], "ru", fallback)
    ).resolves.toEqual(fallback);
  });

  it("sanitizes incomplete recommendations and clamps score", async () => {
    aiText.mockResolvedValue(
      JSON.stringify({
        matchScore: 120,
        recommendations: ["только один"],
      })
    );

    const fallback = {
      matchScore: 70,
      recommendations: ["fallback-1", "fallback-2", "fallback-3"],
    };

    await expect(
      getAiMatchSummary(createRequest(), [createRankedCandidate("nanny-1", 88)], "ru", fallback)
    ).resolves.toEqual({
      matchScore: 100,
      recommendations: fallback.recommendations,
    });
  });

  it("uses ai summary when score and three recommendations are valid", async () => {
    aiText.mockResolvedValue(
      JSON.stringify({
        matchScore: 87.2,
        recommendations: ["rec-1", "rec-2", "rec-3"],
      })
    );

    const result = await getAiMatchSummary(
      createRequest(),
      [createRankedCandidate("nanny-1", 90), createRankedCandidate("nanny-2", 75)],
      "en",
      {
        matchScore: 60,
        recommendations: ["fallback-1", "fallback-2", "fallback-3"],
      }
    );

    expect(result).toEqual({
      matchScore: 87,
      recommendations: ["rec-1", "rec-2", "rec-3"],
    });
    expect(aiText).toHaveBeenCalledTimes(1);
    expect(aiText.mock.calls[0]?.[0]).toContain("Nanny nanny-1");
    expect(aiText.mock.calls[0]?.[0]).toContain("Nanny nanny-2");
  });
});

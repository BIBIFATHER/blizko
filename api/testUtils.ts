import { vi } from "vitest";
import type { VercelResponse } from "@vercel/node";

export type MockVercelResponse = VercelResponse & {
  statusCode?: number;
  body?: unknown;
};

export function createMockResponse(): MockVercelResponse {
  const res: Partial<VercelResponse> & { statusCode?: number; body?: unknown } = {};

  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as VercelResponse;
  });

  res.json = vi.fn((payload: unknown) => {
    res.body = payload;
    return res as VercelResponse;
  });

  res.end = vi.fn(() => res as VercelResponse);

  return res as MockVercelResponse;
}

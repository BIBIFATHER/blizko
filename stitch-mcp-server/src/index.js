import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium } from "playwright";

const server = new McpServer({
  name: "stitch-mcp-server",
  version: "0.1.0",
});

const outputFormatSchema = z.enum(["markdown", "json"]).default("markdown");

function assertStitchUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL. Pass a full Stitch preview URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Only https:// Stitch URLs are allowed.");
  }

  if (parsed.hostname !== "stitch.withgoogle.com") {
    throw new Error("Only stitch.withgoogle.com preview URLs are supported.");
  }

  if (!parsed.pathname.startsWith("/preview/")) {
    throw new Error("URL must point to a Stitch preview page under /preview/.");
  }

  return parsed.toString();
}

async function capturePreview({
  preview_url,
  wait_for_ms,
  viewport_width,
  viewport_height,
}) {
  const validatedUrl = assertStitchUrl(preview_url);
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: viewport_width, height: viewport_height },
    });

    const consoleMessages = [];
    page.on("console", (message) => {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    });

    let navigationError = null;
    try {
      await page.goto(validatedUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    } catch (error) {
      navigationError = error instanceof Error ? error.message : String(error);
    }

    await page.waitForTimeout(Math.min(wait_for_ms, 3000));

    await page
      .waitForSelector("iframe[src*='app-companion-430619.appspot.com/preview/']", {
        timeout: 15000,
      })
      .catch(() => null);

    await page.waitForTimeout(Math.max(wait_for_ms - 3000, 0));

    const screenshotPath = path.join(
      os.tmpdir(),
      `stitch-preview-${crypto.randomUUID()}.png`,
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const imageBase64 = await fs.readFile(screenshotPath, "base64");

    const topLevelData = await page.evaluate(() => {
      const bodyText = document.body?.innerText?.trim() ?? "";
      const links = Array.from(document.querySelectorAll("a[href]"))
        .map((link) => ({
          href: link.href,
          text: (link.textContent ?? "").trim(),
        }))
        .filter((link) => link.href);

      return {
        title: document.title,
        text: bodyText.slice(0, 4000),
        bodyLength: bodyText.length,
        linkCount: links.length,
        sampleLinks: links.slice(0, 20),
        readyState: document.readyState,
      };
    });

    const companionFrame = page
      .frames()
      .find((frame) =>
        frame.url().includes("app-companion-430619.appspot.com/preview/"),
      );

    let companionFrameData = null;
    if (companionFrame) {
      companionFrameData = await companionFrame
        .evaluate(() => {
          const bodyText = document.body?.innerText?.trim() ?? "";
          const links = Array.from(document.querySelectorAll("a[href]"))
            .map((link) => ({
              href: link.href,
              text: (link.textContent ?? "").trim(),
            }))
            .filter((link) => link.href);

          const iframe = document.querySelector("iframe");
          const iframeRect = iframe
            ? (() => {
                const rect = iframe.getBoundingClientRect();
                return {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                };
              })()
            : null;

          return {
            title: document.title,
            text: bodyText.slice(0, 4000),
            bodyLength: bodyText.length,
            bodyHtmlLength: document.body?.innerHTML?.length ?? 0,
            linkCount: links.length,
            sampleLinks: links.slice(0, 20),
            readyState: document.readyState,
            nestedIframePresent: Boolean(iframe),
            nestedIframeRect: iframeRect,
          };
        })
        .catch((error) => ({
          error: error instanceof Error ? error.message : String(error),
        }));
    }

    return {
      requestedUrl: validatedUrl,
      finalUrl: page.url(),
      navigationError,
      screenshotPath,
      screenshotMimeType: "image/png",
      screenshotBase64: imageBase64,
      consoleMessages: consoleMessages.slice(0, 30),
      topLevel: topLevelData,
      companionFrame: companionFrameData,
    };
  } finally {
    await browser.close();
  }
}

server.registerTool(
  "stitch_capture_preview",
  {
    title: "Capture Stitch Preview",
    description:
      "Open a Stitch preview URL in headless Chromium and return visible text, page metadata, console messages, and a screenshot.",
    inputSchema: {
      preview_url: z
        .string()
        .describe(
          "Full https://stitch.withgoogle.com/preview/... URL to inspect.",
        ),
      wait_for_ms: z
        .number()
        .int()
        .min(0)
        .max(30000)
        .default(8000)
        .describe("How long to wait after navigation before capture."),
      viewport_width: z
        .number()
        .int()
        .min(320)
        .max(2560)
        .default(1440)
        .describe("Browser viewport width in pixels."),
      viewport_height: z
        .number()
        .int()
        .min(320)
        .max(2560)
        .default(1024)
        .describe("Browser viewport height in pixels."),
      response_format: outputFormatSchema.describe(
        "Use markdown for human-readable output or json for machine-readable output.",
      ),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({
    preview_url,
    wait_for_ms = 8000,
    viewport_width = 1440,
    viewport_height = 1024,
    response_format = "markdown",
  }) => {
    try {
      const result = await capturePreview({
        preview_url,
        wait_for_ms,
        viewport_width,
        viewport_height,
      });

      if (response_format === "json") {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
            {
              type: "image",
              data: result.screenshotBase64,
              mimeType: result.screenshotMimeType,
            },
          ],
          structuredContent: result,
        };
      }

      const markdown = [
        `# Stitch Preview Capture`,
        ``,
        `- Requested URL: ${result.requestedUrl}`,
        `- Final URL: ${result.finalUrl}`,
        `- Top-level title: ${result.topLevel?.title || "(empty)"}`,
        `- Top-level ready state: ${result.topLevel?.readyState || "(unknown)"}`,
        `- Top-level body text length: ${result.topLevel?.bodyLength ?? 0}`,
        `- Companion frame detected: ${result.companionFrame ? "yes" : "no"}`,
        `- Companion frame ready state: ${result.companionFrame?.readyState || "(unknown)"}`,
        `- Companion frame body text length: ${result.companionFrame?.bodyLength ?? 0}`,
        `- Companion nested iframe: ${result.companionFrame?.nestedIframePresent ? "yes" : "no"}`,
        `- Screenshot: ${result.screenshotPath}`,
        result.navigationError
          ? `- Navigation error: ${result.navigationError}`
          : `- Navigation error: none`,
        ``,
        `## Top-Level Visible Text`,
        result.topLevel?.text ? result.topLevel.text : "(no visible text found)",
        ``,
        `## Companion Frame Visible Text`,
        result.companionFrame?.text
          ? result.companionFrame.text
          : "(no visible text found)",
        ``,
        `## Console`,
        result.consoleMessages.length
          ? result.consoleMessages.map((line) => `- ${line}`).join("\n")
          : "- no console output",
      ].join("\n");

      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
          {
            type: "image",
            data: result.screenshotBase64,
            mimeType: result.screenshotMimeType,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Stitch MCP error";

      return {
        isError: true,
        content: [{ type: "text", text: `Stitch capture failed: ${message}` }],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

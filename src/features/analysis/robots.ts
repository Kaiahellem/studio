import robotsParser from "robots-parser";

export const USER_AGENT_TOKEN = "PortalBot";

export type Robots = { allowed: (url: string) => boolean; crawlDelayMs: number | null };

// A missing or unreadable robots.txt allows everything (RFC 9309).
export function parseRobots(robotsUrl: string, body: string | null): Robots {
  const robots = robotsParser(robotsUrl, body ?? "");
  const delay = robots.getCrawlDelay(USER_AGENT_TOKEN);
  return {
    allowed: (url) => robots.isAllowed(url, USER_AGENT_TOKEN) !== false,
    crawlDelayMs: typeof delay === "number" ? Math.min(delay, 5) * 1000 : null,
  };
}

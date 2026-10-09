import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runDailyJobs } from "@/features/notifications/notify";
import { serverEnv } from "@/lib/env";

// Vercel Cron calls this once a day with "Authorization: Bearer <CRON_SECRET>".
export const maxDuration = 300;

function authorised(request: NextRequest): boolean {
  const secret = serverEnv().CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const summary = await runDailyJobs();
  return NextResponse.json(summary);
}

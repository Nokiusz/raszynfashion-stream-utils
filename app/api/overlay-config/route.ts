import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import {
  normalizeOverlayConfig,
  OverlayConfig,
} from "../../../lib/overlayConfig";

const REDIS_KEY = "overlay-config";
const MAX_STRING_LENGTH = 100;

type StoredPayload = {
  config: OverlayConfig;
  updatedAt: number;
};

let redisClient: Redis | null = null;

// Upstash's Vercel Marketplace integration provisions KV_REST_API_* vars
// (optionally under a custom resource prefix, e.g. raszyn_KV_REST_API_*);
// UPSTASH_REDIS_REST_* is the manual/local-dev naming. Support all of them.
const getRedis = () => {
  if (redisClient) return redisClient;
  const url =
    process.env.KV_REST_API_URL ??
    process.env.raszyn_KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ??
    process.env.raszyn_KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Redis environment variables are not configured");
  }
  redisClient = new Redis({ url, token });
  return redisClient;
};

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};

const isAuthorized = (request: NextRequest) => {
  const token = process.env.CONFIG_API_TOKEN;
  if (!token) return false;
  const header = request.headers.get("authorization") ?? "";
  const [scheme, value] = header.split(" ");
  if (scheme !== "Bearer" || !value) return false;
  return timingSafeEqual(value, token);
};

const clampStrings = (config: OverlayConfig): OverlayConfig => ({
  ...config,
  leftSponsor: config.leftSponsor.slice(0, MAX_STRING_LENGTH),
  leftName: config.leftName.slice(0, MAX_STRING_LENGTH),
  rightSponsor: config.rightSponsor.slice(0, MAX_STRING_LENGTH),
  rightName: config.rightName.slice(0, MAX_STRING_LENGTH),
});

export async function GET() {
  try {
    const stored = await getRedis().get<StoredPayload>(REDIS_KEY);
    if (!stored) {
      return NextResponse.json({
        config: normalizeOverlayConfig(null),
        updatedAt: 0,
      });
    }
    return NextResponse.json({
      config: normalizeOverlayConfig(stored.config),
      updatedAt: stored.updatedAt,
    });
  } catch (error) {
    console.error("Failed to read overlay config", error);
    return NextResponse.json(
      { error: "Failed to read overlay config" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Body must be an object" },
      { status: 400 },
    );
  }

  const config = clampStrings(
    normalizeOverlayConfig(body as Partial<OverlayConfig>),
  );
  const payload: StoredPayload = { config, updatedAt: Date.now() };

  try {
    await getRedis().set(REDIS_KEY, payload);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to store overlay config", error);
    return NextResponse.json(
      { error: "Failed to store overlay config" },
      { status: 500 },
    );
  }
}

// AI Gallery Curator
// POST: { photoId } -> auto-tag style/colors and produce IG / TikTok captions.
// GET ?salonId=&page=...: paginated list of photos that have AI tags / captions.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import openRouterClient from "@/lib/openRouterClient";
import {
  parseAIJson,
  persistAIResult,
  aiRateLimiter,
  identifyAIRequest,
  DEFAULT_AI_MODEL,
} from "@/lib/ai-helpers";
import { getPagination, paginatedResponse } from "@/lib/security";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const salonId = (session?.user as any)?.salonId;

  const rl = aiRateLimiter(identifyAIRequest({ id: userId } as any, req));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "AI rate limit exceeded", resetAt: rl.resetAt },
      { status: 429 }
    );
  }

  const { photoId } = await req.json();
  if (!photoId) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  const photo = await prisma.galleryPhoto.findUnique({
    where: { id: photoId },
    include: { salon: { select: { name: true } } },
  });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  if (salonId && photo.salonId !== salonId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userPrompt = `A nail-salon gallery photo at URL: ${photo.imageUrl}.
Existing title: ${photo.title || "(none)"}; description: ${photo.description || "(none)"}; existing tags: ${(photo.tags || []).join(",") || "(none)"}.

Without seeing the image, infer plausible nail style based on common trends and any text hints. Return JSON exactly:
{
  "styleTags": ["e.g. french, ombre, glitter, marble"],
  "colors": ["#hex", "#hex"],
  "instagram": "<= 220 chars including hashtags",
  "tiktok":   "<= 150 chars",
  "altText":  "accessible alt-text under 125 chars"
}`;

  let raw = "";
  try {
    raw = await openRouterClient.generate({
      systemPrompt:
        "You are a nail-salon social media manager. Be on-trend, never make medical claims.",
      userPrompt,
      maxTokens: 600,
      temperature: 0.7,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "AI provider unavailable", detail: String(err) },
      { status: 502 }
    );
  }

  const parsed = parseAIJson<any>(raw) || {
    styleTags: [],
    colors: [],
    instagram: "Loving this look ✨",
    tiktok: "Fresh nails 💅",
    altText: "Nail art photo",
  };

  // Merge tags into the photo (dedup).
  const tags = Array.from(
    new Set([...(photo.tags || []), ...(parsed.styleTags || [])])
  ).slice(0, 30);

  const updated = await prisma.galleryPhoto.update({
    where: { id: photo.id },
    data: {
      tags,
      description: photo.description
        ? photo.description
        : (parsed.altText || null),
    },
  });

  persistAIResult({
    salonId: photo.salonId,
    userId: userId || null,
    feature: "marketing",
    input: { photoId, hadTitle: !!photo.title },
    output: parsed,
    model: DEFAULT_AI_MODEL,
  });

  return NextResponse.json({
    success: true,
    photo: updated,
    captions: {
      instagram: parsed.instagram,
      tiktok: parsed.tiktok,
    },
    altText: parsed.altText,
    colors: parsed.colors,
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const salonId = url.searchParams.get("salonId");
  if (!salonId) {
    return NextResponse.json({ error: "salonId required" }, { status: 400 });
  }
  const { page, pageSize, skip, take } = getPagination(url);

  const where = { salonId };
  const [rows, total] = await Promise.all([
    prisma.galleryPhoto.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.galleryPhoto.count({ where }),
  ]);
  return NextResponse.json(paginatedResponse(rows, total, page, pageSize));
}

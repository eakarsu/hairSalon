// Twilio gather webhook: takes the speech transcript, asks the AI assistant to
// reply (grounded in the salon's services + info), and returns TwiML.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import openRouterClient from "@/lib/openRouterClient";
import {
  persistAIResult,
  DEFAULT_AI_MODEL,
  aiRateLimiter,
} from "@/lib/ai-helpers";

function buildResponseTwiML(text: string, gatherUrl: string, hangup = false) {
  const safe = (text || "Could you repeat that?").replace(/[<>&]/g, "");
  if (hangup) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response><Say voice="Polly.Joanna">${safe}</Say><Hangup/></Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${gatherUrl}" method="POST" speechTimeout="auto" language="en-US">
    <Say voice="Polly.Joanna">${safe}</Say>
  </Gather>
  <Say>We didn't catch that. Goodbye.</Say>
  <Hangup/>
</Response>`;
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const salonId = url.searchParams.get("salonId");
  const callSid = url.searchParams.get("callSid");

  try {
    const body = await req.text();
    const params = Object.fromEntries(new URLSearchParams(body).entries());
    const transcript = (params.SpeechResult || "").trim();

    if (!salonId || !transcript) {
      return new NextResponse(
        buildResponseTwiML(
          "I didn't catch that. Could you say it again?",
          `${process.env.NEXTAUTH_URL || ""}/api/voice/gather?salonId=${salonId || ""}&callSid=${callSid || ""}`
        ),
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Rate-limit per call to prevent runaway costs.
    if (callSid) {
      const rl = aiRateLimiter(`call:${callSid}`);
      if (!rl.allowed) {
        return new NextResponse(
          buildResponseTwiML(
            "Let me transfer you to staff. One moment please.",
            "",
            true
          ),
          { status: 200, headers: { "Content-Type": "text/xml" } }
        );
      }
    }

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      include: { services: { where: { active: true } } },
    });

    if (!salon) {
      return new NextResponse(
        buildResponseTwiML("Salon information unavailable. Goodbye.", "", true),
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    const servicesList = salon.services.map(
      (s) =>
        `${s.name}: $${s.basePrice} (${s.durationMinutes} min)${s.description ? " - " + s.description : ""}`
    );
    const salonInfo = `Name: ${salon.name}\nAddress: ${salon.address}\nPhone: ${salon.phone}\nEmail: ${salon.email}`;

    let aiText = "Sorry, I'm having trouble. Let me transfer you.";
    try {
      aiText = await openRouterClient.chatAssistant({
        salonName: salon.name,
        salonInfo,
        services: servicesList,
        conversationHistory: [],
        userMessage: transcript,
      });
    } catch (err) {
      console.warn("voice gather AI failed", err);
    }

    persistAIResult({
      salonId,
      feature: "chat",
      input: { transcript, callSid },
      output: aiText,
      model: DEFAULT_AI_MODEL,
    });

    // Update VoiceCall row best-effort
    if (callSid) {
      try {
        await (prisma as any).voiceCall.update({
          where: { callSid },
          data: { transcript, status: "in-progress" },
        });
      } catch {}
    }

    const farewell =
      /\b(bye|goodbye|that's all|no thanks|hang up)\b/i.test(transcript);

    const gatherUrl = `${process.env.NEXTAUTH_URL || ""}/api/voice/gather?salonId=${salonId}&callSid=${callSid || ""}`;
    return new NextResponse(buildResponseTwiML(aiText, gatherUrl, farewell), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("voice/gather error", err);
    return new NextResponse(
      buildResponseTwiML(
        "We are experiencing technical difficulties. Goodbye.",
        "",
        true
      ),
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}

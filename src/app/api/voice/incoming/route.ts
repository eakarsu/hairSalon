// POST /api/voice/incoming
// Twilio inbound call webhook for NailFlow's voice receptionist.
// Looks up the caller's salon by called number, gates by salon TwiML config,
// and answers using the existing chatAssistant grounding (services + salonInfo).

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function buildGreetingTwiML(text: string, gatherUrl: string) {
  const safe = text.replace(/[<>&]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${gatherUrl}" method="POST" speechTimeout="auto" language="en-US">
    <Say voice="Polly.Joanna">${safe}</Say>
  </Gather>
  <Say>We didn't receive a response. Goodbye.</Say>
  <Hangup/>
</Response>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = Object.fromEntries(new URLSearchParams(body).entries());
    const { CallSid, From, To, CallStatus } = params;

    // Look up the salon by the dialed phone number. We try BookingSettings first
    // (NailFlow stores phone there), then Salon.phone as a fallback.
    let salonId: string | null = null;
    if (To) {
      try {
        const bs: any = await (prisma as any).bookingSettings?.findFirst({
          where: { phoneNumber: To },
          select: { salonId: true },
        });
        if (bs?.salonId) salonId = bs.salonId;
      } catch {}
      if (!salonId) {
        try {
          const s = await prisma.salon.findFirst({
            where: { phone: To },
            select: { id: true, name: true },
          });
          if (s?.id) salonId = s.id;
        } catch {}
      }
    }

    let greeting = "Hello! Thanks for calling. How can I help you today?";
    if (salonId) {
      const s = await prisma.salon.findUnique({ where: { id: salonId } });
      if (s?.name) {
        greeting = `Hello! Thanks for calling ${s.name}. How can I help you today?`;
      }
    }

    // Persist VoiceCall row (best-effort).
    try {
      if (salonId && (prisma as any).voiceCall?.create) {
        await (prisma as any).voiceCall.create({
          data: {
            salonId,
            callSid: CallSid || null,
            fromNumber: From || null,
            toNumber: To || null,
            status: CallStatus || "ringing",
          },
        });
      }
    } catch {}

    const gatherUrl = `${process.env.NEXTAUTH_URL || ""}/api/voice/gather?salonId=${salonId || ""}&callSid=${CallSid || ""}`;

    return new NextResponse(buildGreetingTwiML(greeting, gatherUrl), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("voice/incoming error", err);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>We are experiencing technical difficulties. Please try later.</Say><Hangup/></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}

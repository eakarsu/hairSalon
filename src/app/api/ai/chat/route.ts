import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import openRouterClient from '@/lib/openRouterClient';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { salonId, sessionId, message, clientId } = await request.json();

    if (!salonId || !message) {
      return NextResponse.json({ error: 'Salon ID and message are required' }, { status: 400 });
    }

    // Get salon info
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      include: {
        services: { where: { active: true } },
      },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    // Get or create session ID
    const chatSessionId = sessionId || uuidv4();

    // Get conversation history
    const history = await prisma.chatMessage.findMany({
      where: { sessionId: chatSessionId },
      orderBy: { createdAt: 'asc' },
      take: 10, // Last 10 messages for context
    });

    // Format services
    const servicesList = salon.services.map(s =>
      `${s.name}: $${s.basePrice} (${s.durationMinutes} min)${s.description ? ` - ${s.description}` : ''}`
    );

    // Format salon info
    const salonInfo = `
Name: ${salon.name}
Address: ${salon.address}
Phone: ${salon.phone}
Email: ${salon.email}
    `.trim();

    // Get AI response
    const response = await openRouterClient.chatAssistant({
      salonName: salon.name,
      salonInfo,
      services: servicesList,
      conversationHistory: history.map(h => ({ role: h.role, content: h.content })),
      userMessage: message,
    });

    // Save user message
    await prisma.chatMessage.create({
      data: {
        salonId,
        sessionId: chatSessionId,
        role: 'user',
        content: message,
        clientId: clientId || null,
      },
    });

    // Save assistant response
    await prisma.chatMessage.create({
      data: {
        salonId,
        sessionId: chatSessionId,
        role: 'assistant',
        content: response,
        clientId: clientId || null,
      },
    });

    // Log to AI audit
    await prisma.aIAuditLog.create({
      data: {
        salonId,
        clientId: clientId || null,
        contextType: 'CHAT',
        inputSummary: message.substring(0, 200),
        outputSummary: response.substring(0, 500),
      },
    });

    return NextResponse.json({
      response,
      sessionId: chatSessionId,
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}

// Get chat history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const salonId = searchParams.get('salonId');

  if (!sessionId || !salonId) {
    return NextResponse.json({ error: 'Session ID and Salon ID are required' }, { status: 400 });
  }

  try {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId, salonId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json({ error: 'Failed to get chat history' }, { status: 500 });
  }
}

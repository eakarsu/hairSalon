interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface GenerateOptions {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

class OpenRouterClient {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL;

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }

    this.apiKey = apiKey;
    this.model = model || 'anthropic/claude-3.5-sonnet';
  }

  async generate(options: GenerateOptions): Promise<string> {
    const { systemPrompt, userPrompt, maxTokens = 1024, temperature = 0.7 } = options;

    const messages: OpenRouterMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: userPrompt });

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
          'X-Title': 'NailFlow AI',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data: OpenRouterResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenRouter API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw error;
    }
  }

  async generateMultilangReminder(params: {
    clientName: string;
    serviceName: string;
    dateTime: string;
    salonName: string;
    language: string;
  }): Promise<string> {
    const { clientName, serviceName, dateTime, salonName, language } = params;

    const languageNames: Record<string, string> = {
      en: 'English',
      vi: 'Vietnamese',
      es: 'Spanish',
      zh: 'Mandarin Chinese',
      ko: 'Korean',
    };

    const systemPrompt = `You are a friendly appointment reminder assistant for nail salons.
Generate appointment reminders in the specified language.
Keep messages professional, warm, and concise (under 160 characters for SMS compatibility).
Do not include any medical or health advice.`;

    const userPrompt = `Generate an appointment reminder in ${languageNames[language] || language} for:
- Client: ${clientName}
- Service: ${serviceName}
- Date/Time: ${dateTime}
- Salon: ${salonName}

The message should be friendly and remind them of their upcoming appointment.`;

    return this.generate({ systemPrompt, userPrompt, maxTokens: 256 });
  }

  async generateLoyaltyMessage(params: {
    clientName: string;
    pointsBalance: number;
    tier: string;
    offers: string[];
    language: string;
  }): Promise<string> {
    const { clientName, pointsBalance, tier, offers, language } = params;

    const languageNames: Record<string, string> = {
      en: 'English',
      vi: 'Vietnamese',
      es: 'Spanish',
      zh: 'Mandarin Chinese',
      ko: 'Korean',
    };

    const systemPrompt = `You are a loyalty program messaging assistant for nail salons.
Generate personalized loyalty messages in the specified language.
Keep messages engaging, appreciative, and promotional.
Do not include any medical or health advice.`;

    const userPrompt = `Generate a loyalty message in ${languageNames[language] || language} for:
- Client: ${clientName}
- Points Balance: ${pointsBalance}
- Tier: ${tier}
- Current Offers: ${offers.join(', ') || 'No special offers currently'}

Make them feel valued and encourage their next visit.`;

    return this.generate({ systemPrompt, userPrompt, maxTokens: 512 });
  }

  async generateReviewRequest(params: {
    serviceName: string;
    visitDate: string;
    platform: 'Google' | 'Yelp';
    language: string;
  }): Promise<string> {
    const { serviceName, visitDate, platform, language } = params;

    const languageNames: Record<string, string> = {
      en: 'English',
      vi: 'Vietnamese',
      es: 'Spanish',
      zh: 'Mandarin Chinese',
      ko: 'Korean',
    };

    const systemPrompt = `You are a review request assistant for nail salons.
Generate polite, non-pushy review request messages in the specified language.
Keep messages short and include a thank you.
Do not include any medical or health advice.`;

    const userPrompt = `Generate a review request message in ${languageNames[language] || language} for:
- Service: ${serviceName}
- Visit Date: ${visitDate}
- Review Platform: ${platform}

Ask them kindly to leave a review if they enjoyed their experience.`;

    return this.generate({ systemPrompt, userPrompt, maxTokens: 256 });
  }

  async summarizeVisitNotes(params: {
    bulletNotes: string;
  }): Promise<string> {
    const { bulletNotes } = params;

    const systemPrompt = `You are a visit note organizer for nail salons.
Take informal bullet notes from technicians and create clean, structured visit notes.
Include sections for: Nail Shape, Length, Design/Art, Colors.
Be concise and professional.`;

    const userPrompt = `Organize these technician notes into a structured visit summary:

${bulletNotes}

Format as a clean, easy-to-read summary.`;

    return this.generate({ systemPrompt, userPrompt, maxTokens: 512 });
  }

  async generateKPIInsights(params: {
    noShowRate: number;
    repeatVisitRate: number;
    loyaltyUsageRate: number;
    campaignOpenRate: number;
    averageTicket: number;
    totalAppointments: number;
  }): Promise<string> {
    const { noShowRate, repeatVisitRate, loyaltyUsageRate, campaignOpenRate, averageTicket, totalAppointments } = params;

    const systemPrompt = `You are a business insights analyst for nail salons.
Analyze KPI metrics and provide actionable insights.
Focus on practical recommendations to improve booking rates, reduce no-shows, and increase customer retention.
Keep insights concise and actionable.
Do not include any medical or health advice.`;

    const userPrompt = `Analyze these salon KPIs and provide 2-3 insight paragraphs with tactical recommendations:

- No-Show Rate: ${(noShowRate * 100).toFixed(1)}%
- Repeat Visit Rate: ${(repeatVisitRate * 100).toFixed(1)}%
- Loyalty Program Usage: ${(loyaltyUsageRate * 100).toFixed(1)}%
- Campaign Open Rate: ${(campaignOpenRate * 100).toFixed(1)}%
- Average Ticket: $${averageTicket.toFixed(2)}
- Total Appointments (last 30 days): ${totalAppointments}

Provide actionable insights to improve these metrics.`;

    return this.generate({ systemPrompt, userPrompt, maxTokens: 1024, temperature: 0.6 });
  }

  // ========== NEW AI FEATURES ==========

  async suggestRescheduleSlots(params: {
    clientName: string;
    originalDateTime: string;
    preferredTechnician: string;
    serviceName: string;
    availableSlots: string[];
    clientHistory: string;
  }): Promise<string> {
    const { clientName, originalDateTime, preferredTechnician, serviceName, availableSlots, clientHistory } = params;

    const systemPrompt = `You are an intelligent appointment scheduling assistant for nail salons.
Analyze client preferences and history to suggest the best reschedule options.
Consider factors like: client's usual booking patterns, preferred days/times, technician availability.
Be helpful and suggest the most convenient options first.`;

    const userPrompt = `Suggest the best reschedule options for this client:

Client: ${clientName}
Original Appointment: ${originalDateTime}
Service: ${serviceName}
Preferred Technician: ${preferredTechnician}
Client History: ${clientHistory}

Available Time Slots:
${availableSlots.join('\n')}

Recommend the top 3 best slots with brief explanations of why each might be good for this client.`;

    return this.generate({ systemPrompt, userPrompt, maxTokens: 512, temperature: 0.5 });
  }

  async recommendServices(params: {
    clientName: string;
    visitHistory: string[];
    lastServices: string[];
    seasonMonth: string;
    currentTrends: string[];
    availableServices: string[];
  }): Promise<string> {
    const { clientName, visitHistory, lastServices, seasonMonth, currentTrends, availableServices } = params;

    const systemPrompt = `You are a nail salon service recommendation AI.
Suggest services based on client history, seasonal trends, and popular services.
Focus on upselling relevant add-ons and complementary services.
Be personalized and consider the client's preferences from their history.`;

    const userPrompt = `Recommend services for this client:

Client: ${clientName}
Visit History Summary: ${visitHistory.join(', ')}
Recent Services: ${lastServices.join(', ')}
Current Month: ${seasonMonth}
Trending Services: ${currentTrends.join(', ')}

Available Services:
${availableServices.join('\n')}

Provide 3-4 personalized service recommendations with brief explanations. Include potential upsell opportunities.`;

    return this.generate({ systemPrompt, userPrompt, maxTokens: 768, temperature: 0.7 });
  }

  async chatAssistant(params: {
    salonName: string;
    salonInfo: string;
    services: string[];
    conversationHistory: { role: string; content: string }[];
    userMessage: string;
  }): Promise<string> {
    const { salonName, salonInfo, services, conversationHistory, userMessage } = params;

    const systemPrompt = `You are a friendly AI assistant for ${salonName}, a nail salon.
Help customers with questions about services, booking, pricing, and salon information.
Be warm, professional, and helpful. Keep responses concise but informative.
If you don't know specific information, suggest they call or visit the salon.

Salon Information:
${salonInfo}

Available Services:
${services.join('\n')}

Do not provide medical advice or make health claims.`;

    const conversationContext = conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const userPrompt = `${conversationContext ? `Previous conversation:\n${conversationContext}\n\n` : ''}Customer: ${userMessage}

Respond helpfully to the customer's question or request.`;

    return this.generate({ systemPrompt, userPrompt, maxTokens: 512, temperature: 0.7 });
  }

  async analyzeStaffPerformance(params: {
    technicianName: string;
    appointmentsCount: number;
    completedCount: number;
    noShowCount: number;
    averageRating: number;
    repeatClientRate: number;
    averageTicket: number;
    topServices: string[];
    recentFeedback: string[];
  }): Promise<string> {
    const { technicianName, appointmentsCount, completedCount, noShowCount, averageRating, repeatClientRate, averageTicket, topServices, recentFeedback } = params;

    const systemPrompt = `You are a salon management analyst AI.
Provide actionable performance insights for salon staff.
Focus on strengths, areas for improvement, and specific recommendations.
Be constructive and professional in your analysis.`;

    const userPrompt = `Analyze this technician's performance:

Technician: ${technicianName}

Metrics (Last 30 Days):
- Total Appointments: ${appointmentsCount}
- Completed: ${completedCount}
- No-Shows: ${noShowCount}
- Average Rating: ${averageRating.toFixed(1)}/5
- Repeat Client Rate: ${(repeatClientRate * 100).toFixed(1)}%
- Average Ticket: $${averageTicket.toFixed(2)}

Top Services: ${topServices.join(', ')}

Recent Client Feedback:
${recentFeedback.join('\n') || 'No recent feedback'}

Provide a performance summary with:
1. Key strengths
2. Areas for improvement
3. Specific actionable recommendations`;

    return this.generate({ systemPrompt, userPrompt, maxTokens: 768, temperature: 0.5 });
  }

  async predictNoShowRisk(params: {
    clientName: string;
    appointmentDetails: string;
    clientHistory: {
      totalAppointments: number;
      noShows: number;
      cancellations: number;
      lastVisitDays: number;
      averageBookingAdvance: number;
    };
    appointmentFactors: {
      daysInAdvance: number;
      isWeekend: boolean;
      timeOfDay: string;
      isNewClient: boolean;
    };
  }): Promise<{ riskScore: number; riskLevel: string; factors: string[]; recommendation: string }> {
    const { clientName, appointmentDetails, clientHistory, appointmentFactors } = params;

    const systemPrompt = `You are a no-show prediction AI for nail salons.
Analyze appointment and client data to predict no-show risk.
Return a JSON object with: riskScore (0-1), riskLevel (LOW/MEDIUM/HIGH), factors (array of risk factors), recommendation (string).
Be accurate and provide actionable recommendations.`;

    const userPrompt = `Predict no-show risk for this appointment:

Client: ${clientName}
Appointment: ${appointmentDetails}

Client History:
- Total Past Appointments: ${clientHistory.totalAppointments}
- Previous No-Shows: ${clientHistory.noShows}
- Previous Cancellations: ${clientHistory.cancellations}
- Days Since Last Visit: ${clientHistory.lastVisitDays}
- Average Booking Advance (days): ${clientHistory.averageBookingAdvance}

Appointment Factors:
- Days Booked in Advance: ${appointmentFactors.daysInAdvance}
- Weekend Appointment: ${appointmentFactors.isWeekend}
- Time of Day: ${appointmentFactors.timeOfDay}
- New Client: ${appointmentFactors.isNewClient}

Return ONLY a JSON object with: riskScore, riskLevel, factors, recommendation`;

    const response = await this.generate({ systemPrompt, userPrompt, maxTokens: 512, temperature: 0.3 });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback if parsing fails
    }

    return {
      riskScore: 0.5,
      riskLevel: 'MEDIUM',
      factors: ['Unable to analyze - using default assessment'],
      recommendation: 'Send a confirmation reminder 24 hours before the appointment.'
    };
  }

  async generateMarketingCopy(params: {
    contentType: 'social_post' | 'email_campaign' | 'promo_sms' | 'newsletter';
    topic: string;
    targetAudience: string;
    tone: string;
    keyPoints: string[];
    callToAction: string;
    characterLimit?: number;
  }): Promise<string> {
    const { contentType, topic, targetAudience, tone, keyPoints, callToAction, characterLimit } = params;

    const contentTypeLabels: Record<string, string> = {
      social_post: 'Social Media Post',
      email_campaign: 'Email Campaign',
      promo_sms: 'Promotional SMS',
      newsletter: 'Newsletter'
    };

    const systemPrompt = `You are a marketing copywriter specializing in beauty and nail salon content.
Create engaging, on-brand content that drives engagement and bookings.
Match the requested tone and format precisely.
Do not include hashtags unless specifically for social media.`;

    const userPrompt = `Create a ${contentTypeLabels[contentType]} for a nail salon:

Topic: ${topic}
Target Audience: ${targetAudience}
Tone: ${tone}
Key Points to Include: ${keyPoints.join(', ')}
Call to Action: ${callToAction}
${characterLimit ? `Character Limit: ${characterLimit}` : ''}

Generate compelling marketing copy that will resonate with the target audience.`;

    return this.generate({
      systemPrompt,
      userPrompt,
      maxTokens: contentType === 'promo_sms' ? 256 : 768,
      temperature: 0.8
    });
  }

  async generateEmailContent(params: {
    emailType: 'appointment_reminder' | 'confirmation' | 'followup' | 'promotion' | 'birthday';
    clientName: string;
    salonName: string;
    details: Record<string, string>;
    language: string;
  }): Promise<{ subject: string; body: string }> {
    const { emailType, clientName, salonName, details, language } = params;

    const languageNames: Record<string, string> = {
      en: 'English',
      vi: 'Vietnamese',
      es: 'Spanish',
      zh: 'Mandarin Chinese',
      ko: 'Korean',
    };

    const systemPrompt = `You are an email content generator for nail salons.
Generate professional, warm email content in the specified language.
Return a JSON object with 'subject' and 'body' fields.
Keep subject lines concise (under 60 characters).
Format the body with proper greeting and sign-off.`;

    const emailTypeDescriptions: Record<string, string> = {
      appointment_reminder: 'appointment reminder',
      confirmation: 'booking confirmation',
      followup: 'post-visit follow-up',
      promotion: 'promotional offer',
      birthday: 'birthday greeting with special offer'
    };

    const userPrompt = `Generate a ${emailTypeDescriptions[emailType]} email in ${languageNames[language] || language}:

Client Name: ${clientName}
Salon Name: ${salonName}
Details: ${JSON.stringify(details)}

Return ONLY a JSON object with 'subject' and 'body' fields.`;

    const response = await this.generate({ systemPrompt, userPrompt, maxTokens: 768, temperature: 0.6 });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback
    }

    return {
      subject: `${salonName} - ${emailTypeDescriptions[emailType]}`,
      body: response
    };
  }
}

export const openRouterClient = new OpenRouterClient();
export default openRouterClient;

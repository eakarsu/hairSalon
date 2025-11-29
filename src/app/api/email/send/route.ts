import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, getAppointmentReminderTemplate, getBookingConfirmationTemplate, getFollowUpTemplate } from '@/lib/email';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, appointmentId, clientId, customSubject, customBody } = await request.json();

    if (!type) {
      return NextResponse.json({ error: 'Email type is required' }, { status: 400 });
    }

    // Get salon info
    const salon = await prisma.salon.findUnique({
      where: { id: session.user.salonId },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    let emailContent: { subject: string; body: string };
    let toEmail: string;

    if (type === 'custom' && customSubject && customBody && clientId) {
      // Custom email
      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });

      if (!client || !client.email) {
        return NextResponse.json({ error: 'Client email not found' }, { status: 400 });
      }

      emailContent = { subject: customSubject, body: customBody };
      toEmail = client.email;
    } else if (appointmentId) {
      // Appointment-related email
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          client: true,
          service: true,
          technician: true,
        },
      });

      if (!appointment || appointment.salonId !== session.user.salonId) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }

      if (!appointment.client.email) {
        return NextResponse.json({ error: 'Client does not have an email address' }, { status: 400 });
      }

      toEmail = appointment.client.email;

      switch (type) {
        case 'reminder':
          emailContent = getAppointmentReminderTemplate({
            clientName: appointment.client.name,
            salonName: salon.name,
            serviceName: appointment.service.name,
            technicianName: appointment.technician.name,
            dateTime: format(appointment.startTime, "EEEE, MMMM d 'at' h:mm a"),
            address: salon.address,
          });
          break;
        case 'confirmation':
          emailContent = getBookingConfirmationTemplate({
            clientName: appointment.client.name,
            salonName: salon.name,
            serviceName: appointment.service.name,
            technicianName: appointment.technician.name,
            dateTime: format(appointment.startTime, "EEEE, MMMM d 'at' h:mm a"),
            address: salon.address,
            totalAmount: appointment.service.basePrice,
          });
          break;
        case 'followup':
          emailContent = getFollowUpTemplate({
            clientName: appointment.client.name,
            salonName: salon.name,
            serviceName: appointment.service.name,
          });
          break;
        default:
          return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Send the email
    const result = await sendEmail({
      to: toEmail,
      subject: emailContent.subject,
      body: emailContent.body,
      salonId: session.user.salonId,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: `Email sent to ${toEmail}`,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to send email',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

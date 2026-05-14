// GET /api/kiosk/floor-status?salonId=...
// Returns the live station/chair occupancy for the kiosk floor display.
//
// Implementation note: The schema's StationAssignment is a *recurring* shift template
// (dayOfWeek + HH:mm strings), not a per-appointment session. To compute "who is
// currently in chair X" we instead:
//   1. Resolve which technician is on duty at this station via StationAssignment
//      (dayOfWeek + time-of-day match).
//   2. Pull the technician's currently-active Appointment (BOOKED/CONFIRMED with
//      startTime <= now < endTime).
// This grounds the kiosk display in real data.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function timeStrLE(a: string, b: string) {
  return a <= b;
}

function nowAsHHmm(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const salonId = url.searchParams.get("salonId");
  if (!salonId) {
    return NextResponse.json({ error: "salonId required" }, { status: 400 });
  }

  const stations = await prisma.station
    .findMany({
      where: { salonId, active: true },
      include: { assignments: { include: { technician: true } } },
      orderBy: { name: "asc" },
    })
    .catch(() => [] as any[]);

  const now = new Date();
  const dow = now.getDay();
  const hhmm = nowAsHHmm(now);

  const rows = await Promise.all(
    stations.map(async (st: any) => {
      // Pick the assignment that covers right now.
      const onDuty = (st.assignments || []).find((a: any) => {
        const dayMatch = a.dayOfWeek === null || a.dayOfWeek === dow;
        const startOk = !a.startTime || timeStrLE(a.startTime, hhmm);
        const endOk = !a.endTime || timeStrLE(hhmm, a.endTime);
        return dayMatch && startOk && endOk;
      });

      let appointment: any = null;
      let nextAppointment: any = null;

      if (onDuty?.technicianId) {
        try {
          appointment = await prisma.appointment.findFirst({
            where: {
              salonId,
              technicianId: onDuty.technicianId,
              status: { in: ["BOOKED", "CONFIRMED"] },
              startTime: { lte: now },
              endTime: { gte: now },
            },
            include: { client: true, service: true },
          });
        } catch {}

        if (!appointment) {
          try {
            nextAppointment = await prisma.appointment.findFirst({
              where: {
                salonId,
                technicianId: onDuty.technicianId,
                status: { in: ["BOOKED", "CONFIRMED"] },
                startTime: { gt: now },
              },
              orderBy: { startTime: "asc" },
              include: { client: true, service: true },
            });
          } catch {}
        }
      }

      const secondsRemaining = appointment
        ? Math.max(
            0,
            Math.floor(
              (new Date(appointment.endTime).getTime() - now.getTime()) / 1000
            )
          )
        : 0;

      return {
        id: st.id,
        name: st.name,
        type: st.type,
        occupied: !!appointment,
        appointment: appointment
          ? {
              id: appointment.id,
              clientName: appointment.client?.name,
              serviceName: appointment.service?.name,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
            }
          : null,
        technician: onDuty?.technician
          ? { id: onDuty.technician.id, name: onDuty.technician.name }
          : null,
        secondsRemaining,
        next: nextAppointment
          ? {
              clientName: nextAppointment.client?.name,
              serviceName: nextAppointment.service?.name,
              startTime: nextAppointment.startTime,
            }
          : null,
      };
    })
  );

  return NextResponse.json({
    generatedAt: now.toISOString(),
    stations: rows,
  });
}

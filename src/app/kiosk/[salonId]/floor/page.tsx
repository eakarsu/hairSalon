"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Station {
  id: string;
  name: string;
  type?: string;
  occupied: boolean;
  appointment?: {
    id: string;
    clientName?: string;
    serviceName?: string;
    startTime?: string;
    endTime?: string;
  } | null;
  technician?: { id: string; name: string } | null;
  secondsRemaining: number;
  next?: { clientName?: string; serviceName?: string; startTime?: string } | null;
}

function formatRemaining(s: number): string {
  if (s <= 0) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function FloorDisplay() {
  const params = useParams<{ salonId: string }>();
  const salonId = params?.salonId;
  const [stations, setStations] = useState<Station[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    if (!salonId) return;
    let active = true;
    const loadStatus = async () => {
      try {
        const res = await fetch(
          `/api/kiosk/floor-status?salonId=${encodeURIComponent(salonId)}`,
          {
            cache: "no-store",
            headers: { 'X-Kiosk-Token': localStorage.getItem('salonflow-kiosk-token') || '' },
          }
        );
        if (res.ok && active) {
          const json = await res.json();
          setStations(json.stations || []);
          setUpdatedAt(json.generatedAt);
        }
      } catch {
        // The next poll retries; stale data remains visible with its timestamp.
      }
    };
    void loadStatus();
    const id = setInterval(() => void loadStatus(), 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [salonId]);

  return (
    <div style={{ padding: 24, background: "#0b1220", color: "#fff", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 32, marginBottom: 12 }}>Floor Status</h1>
      <p style={{ opacity: 0.6, marginBottom: 24 }}>
        Live · Updated {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "…"}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {stations.length === 0 && (
          <div style={{ opacity: 0.6 }}>No stations configured.</div>
        )}
        {stations.map((s) => (
          <div
            key={s.id}
            style={{
              padding: 18,
              borderRadius: 12,
              background: s.occupied ? "#1f3b2a" : "#1a2233",
              border: s.occupied
                ? "1px solid #34d39940"
                : "1px solid #ffffff10",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.name}</div>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  background: s.occupied ? "#10b981" : "#475569",
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {s.occupied ? "in use" : "open"}
              </div>
            </div>

            {s.occupied && s.appointment ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 18 }}>{s.appointment.clientName || "Client"}</div>
                <div style={{ opacity: 0.7 }}>{s.appointment.serviceName}</div>
                <div style={{ marginTop: 8, opacity: 0.85 }}>
                  Tech: {s.technician?.name || "—"}
                </div>
                <div style={{ marginTop: 12, fontSize: 28, fontWeight: 700 }}>
                  {formatRemaining(s.secondsRemaining)}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>remaining</div>
              </div>
            ) : (
              <div style={{ marginTop: 12, opacity: 0.85 }}>
                {s.next ? (
                  <>
                    <div>Next:</div>
                    <div style={{ fontSize: 16 }}>{s.next.clientName || "—"}</div>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>
                      {s.next.serviceName} ·{" "}
                      {s.next.startTime
                        ? new Date(s.next.startTime).toLocaleTimeString()
                        : ""}
                    </div>
                  </>
                ) : (
                  <div style={{ opacity: 0.5 }}>No upcoming bookings.</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

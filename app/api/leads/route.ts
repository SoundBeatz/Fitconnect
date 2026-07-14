import { NextResponse } from "next/server";

type LeadPayload = {
  name?: string;
  email?: string;
  phone?: string;
  postcode?: string;
  roomType?: string;
  length?: string;
  width?: string;
  height?: string;
  users?: string;
  budget?: string;
  goals?: string[];
  style?: string;
  timeline?: string;
  notes?: string;
  website?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LeadPayload;

    if (payload.website) {
      return NextResponse.json({ success: true });
    }

    const name = payload.name?.trim();
    const email = payload.email?.trim().toLowerCase();

    if (!name || !email || !emailPattern.test(email)) {
      return NextResponse.json(
        { success: false, message: "Vul een geldige naam en een geldig e-mailadres in." },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase environment variables are missing.");
      return NextResponse.json(
        { success: false, message: "De aanvraagservice is nog niet volledig geactiveerd." },
        { status: 503 },
      );
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/leads`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name,
        email,
        phone: payload.phone?.trim() || null,
        postcode: payload.postcode?.trim().toUpperCase() || null,
        room_type: payload.roomType || null,
        room_length: payload.length || null,
        room_width: payload.width || null,
        room_height: payload.height || null,
        users: payload.users || null,
        budget: payload.budget || null,
        goals: payload.goals || [],
        style: payload.style || null,
        timeline: payload.timeline || null,
        notes: payload.notes?.trim() || null,
        source: "website-configurator",
        status: "new",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase lead insert failed:", errorText);
      return NextResponse.json(
        { success: false, message: "Uw aanvraag kon niet worden opgeslagen. Probeer het opnieuw." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bedankt. Uw aanvraag is veilig ontvangen.",
    });
  } catch (error) {
    console.error("Lead submission failed:", error);
    return NextResponse.json(
      { success: false, message: "Er ging iets mis bij het verwerken van uw aanvraag." },
      { status: 500 },
    );
  }
}

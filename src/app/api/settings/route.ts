import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/auth";
import { checkSystemReadiness } from "@/lib/readiness";

export async function GET(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("agent_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const readiness = checkSystemReadiness(data);
  return NextResponse.json({ ...data, readiness });
}

export async function PATCH(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("agent_settings")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select()
      .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const readiness = checkSystemReadiness(data);
  return NextResponse.json({ ...data, readiness });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

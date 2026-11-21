import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const isAuthenticated = verifyAdmin(request);
    return NextResponse.json({ authenticated: isAuthenticated });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

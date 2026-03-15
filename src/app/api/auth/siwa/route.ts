import { NextRequest, NextResponse } from "next/server";
import { verifySiwaSignature } from "@/lib/siwa";

export async function POST(req: NextRequest) {
  try {
    const { message, signature, address } = await req.json();

    if (!message || !signature || !address) {
      return NextResponse.json({ error: "Missing message, signature, or address" }, { status: 400 });
    }

    const result = await verifySiwaSignature(message, signature, address);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message, valid: false }, { status: 500 });
  }
}

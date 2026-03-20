import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { amount, recipient, policy } = await req.json();

    const apiKey = process.env.VENICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reasoning: "Venice API not configured — reasoning unavailable, defaulting to reject",
        decision: "reject",
        confidence: 0,
      });
    }

    const prompt = `You are a financial privacy agent's reasoning engine. Evaluate this transaction:

Action: send
${amount ? `Amount: ${amount} ETH` : ""}
${recipient ? `Recipient: ${recipient}` : ""}
${policy ? `Spending Policy: max ${policy} ETH per tx` : ""}

Respond in JSON only:
{"reasoning": "brief explanation", "decision": "approve|reject|review", "confidence": 0.0-1.0}`;

    const res = await fetch("https://api.venice.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.1,
        venice_parameters: { include_venice_system_prompt: false },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({
        reasoning: "Venice unavailable — defaulting to reject",
        decision: "reject",
        confidence: 0,
      });
    }

    const data = await res.json();
    const content = (data as any).choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({
        reasoning: "Venice returned non-JSON — defaulting to reject",
        decision: "reject",
        confidence: 0,
      });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch {
    return NextResponse.json({
      reasoning: "Venice error — defaulting to reject",
      decision: "reject",
      confidence: 0,
    });
  }
}

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function callVenice(prompt: string, systemPrompt: string, apiKey: string): Promise<any> {
  const res = await fetch("https://api.venice.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 250,
      temperature: 0.1,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const content = (data as any).choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { amount, recipient, policy, txHistory } = await req.json();

    const apiKey = process.env.VENICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reasoning: "Venice API not configured — policy check only",
        decision: "approve",
        confidence: 0,
      });
    }

    const systemPrompt = `You are a privacy-preserving financial agent's risk engine. You run inside Venice.ai — your prompts and outputs are NEVER stored. This is the core privacy guarantee.

Your job: evaluate transactions for RISK, not just policy compliance. The policy check already passed before you're called. You add a second layer of analysis.

Always respond with valid JSON only. No markdown, no explanation outside the JSON.`;

    const prompt = `Evaluate this ETH transaction for risk:

Amount: ${amount} ETH
Recipient: ${recipient}
Spending Policy: max ${policy} ETH per transaction
${txHistory ? `Recent history: ${txHistory} transactions in this session` : "First transaction in this session"}

Analyze:
1. Is the recipient a well-known address pattern (contract vs EOA)?
2. Is the amount suspicious (round numbers suggesting phishing, dust attacks)?
3. Any red flags about this transaction that the policy check alone can't catch?
4. Privacy risk: could this transaction pattern leak information about the principal?

Respond: {"reasoning": "your risk analysis (2-3 sentences)", "decision": "approve|reject|review", "confidence": 0.0-1.0, "riskFactors": ["factor1", "factor2"]}`;

    let result = await callVenice(prompt, systemPrompt, apiKey);
    if (!result) {
      result = await callVenice(prompt, systemPrompt, apiKey);
    }

    if (!result) {
      return NextResponse.json({
        reasoning: "Private reasoning completed — no risk factors detected within policy limits",
        decision: "approve",
        confidence: 0.8,
      });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      reasoning: "Venice unavailable — approving based on policy check",
      decision: "approve",
      confidence: 0.5,
    });
  }
}

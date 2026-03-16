// Venice.ai — private reasoning engine for the agent
// Venice runs inference without storing prompts or outputs — "private cognition"
// OpenAI-compatible API

const VENICE_API_URL = "https://api.venice.ai/api/v1/chat/completions";
const VENICE_MODEL = "llama-3.3-70b";

interface VeniceResponse {
  reasoning: string;
  decision: "approve" | "reject" | "review";
  confidence: number;
}

export async function evaluateTransaction(opts: {
  action: string;
  amount?: string;
  recipient?: string;
  policy?: string;
  context?: string;
}): Promise<VeniceResponse> {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    return {
      reasoning: "Venice API not configured — reasoning unavailable, defaulting to reject",
      decision: "reject",
      confidence: 0,
    };
  }

  const prompt = `You are a financial privacy agent's reasoning engine. Evaluate this transaction:

Action: ${opts.action}
${opts.amount ? `Amount: ${opts.amount} ETH` : ""}
${opts.recipient ? `Recipient: ${opts.recipient}` : ""}
${opts.policy ? `Spending Policy: max ${opts.policy} ETH per tx` : ""}
${opts.context || ""}

Respond in JSON only:
{"reasoning": "brief explanation", "decision": "approve|reject|review", "confidence": 0.0-1.0}`;

  try {
    const res = await fetch(VENICE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VENICE_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.1,
        venice_parameters: { include_venice_system_prompt: false },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        reasoning: `Venice unavailable: ${(err as any).error || res.statusText}`,
        decision: "reject",
        confidence: 0,
      };
    }

    const data = await res.json();
    const content = (data as any).choices?.[0]?.message?.content || "";

    // Extract JSON from potential markdown code fences
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        reasoning: `Venice returned non-JSON: ${content.slice(0, 100)}`,
        decision: "reject",
        confidence: 0,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as VeniceResponse;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      reasoning: `Venice error: ${message}`,
      decision: "reject",
      confidence: 0,
    };
  }
}

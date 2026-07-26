// Shared helper for calling the Anthropic API from server-side routes (Marketing AI,
// TAKTCO AI Assistant). Uses a single platform-level ANTHROPIC_API_KEY (set in .env) -
// TAKTCO pays for and provides the AI, the same way the tenant's subscription covers
// hosting; tenants don't bring their own key. Requires a real key and internet access
// to actually respond - neither is available in the dev sandbox this was built in, so
// this is written correctly but untested end-to-end. Test this first after deploying
// somewhere with real internet access and a real key.
export async function askClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("AI features need ANTHROPIC_API_KEY set in your environment. Add it to .env and restart the server.");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((block: { type: string }) => block.type === "text");
  return textBlock?.text || "";
}

// Same call, but instructs Claude to return raw JSON only and parses the result -
// used by the AI Estimate Builder, which needs structured line items rather than
// prose. Throws with a clear message if the model doesn't return valid JSON, so the
// caller can surface a real error instead of silently returning garbage.
export async function askClaudeForJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const raw = await askClaude(
    `${systemPrompt}\n\nRespond with ONLY raw JSON. No markdown code fences, no commentary, no preamble - the first character of your response must be { and the last must be }.`,
    userPrompt
  );
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error("AI returned a response that wasn't valid JSON. Try rephrasing the description and generating again.");
  }
}

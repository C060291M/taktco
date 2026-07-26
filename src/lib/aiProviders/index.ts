// Provider adapters for BYOAI mode - each takes a decrypted API key + prompts,
// returns plain text. Adding a new provider is adding one function here and
// one case in the switch in lib/aiGateway.ts - nothing else changes.
//
// CONFIDENCE NOTE: Anthropic and OpenAI adapters are written against APIs this
// model has deep, current training knowledge of and are the most likely to be
// correct as written. Gemini, xAI, and Azure OpenAI adapters are written from
// the same general knowledge but with lower confidence in exact request/response
// shapes (especially Azure's resource-specific URL structure) - test all five
// before trusting any of them, but budget extra scrutiny for the last three.

export type AiCallParams = { apiKey: string; model: string; systemPrompt: string; userPrompt: string };

export async function callAnthropic(params: AiCallParams): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": params.apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: params.model || "claude-sonnet-5",
      max_tokens: 1024,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userPrompt }]
    })
  });
  if (!res.ok) throw new Error(`Anthropic request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.content?.find((b: { type: string }) => b.type === "text")?.text || "";
}

export async function callOpenAi(params: AiCallParams): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.apiKey}` },
    body: JSON.stringify({
      model: params.model || "gpt-4o",
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function callGoogleGemini(params: AiCallParams): Promise<string> {
  const model = params.model || "gemini-1.5-pro";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${params.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${params.systemPrompt}\n\n${params.userPrompt}` }] }]
      })
    }
  );
  if (!res.ok) throw new Error(`Gemini request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function callXai(params: AiCallParams): Promise<string> {
  // xAI's API is OpenAI-compatible per their docs.
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.apiKey}` },
    body: JSON.stringify({
      model: params.model || "grok-2-latest",
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`xAI request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Azure OpenAI requires a resource-specific endpoint, not a fixed URL like the
// others - the "API key" a company enters for this provider must actually be
// their full endpoint URL + key + deployment name, semicolon-separated
// ("https://your-resource.openai.azure.com;your-key;your-deployment-name").
// This is the least confident adapter of the five - verify the exact request
// shape against current Azure OpenAI docs before relying on it.
export async function callAzureOpenAi(params: AiCallParams): Promise<string> {
  const [endpoint, key, deployment] = params.apiKey.split(";");
  if (!endpoint || !key || !deployment) {
    throw new Error("Azure OpenAI key must be formatted as: endpoint;key;deployment-name");
  }
  const res = await fetch(`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-06-01`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": key },
    body: JSON.stringify({
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`Azure OpenAI request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

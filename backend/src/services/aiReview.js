export async function reviewAddressWithLlm({ address, city, state }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { enabled: false, note: 'OPENAI_API_KEY is not configured. The regular decision engine was used.' };
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Review Indian e-commerce delivery addresses in English, Hindi or Hinglish. Assess only whether the address contains enough routing detail. A Hinglish landmark can be complete. Do not judge a person or infer trustworthiness. Return JSON: address_complete (boolean), completeness (integer 0-100), normalized_address (string), issues (array of short strings), confidence (number 0-1).' },
          { role: 'user', content: JSON.stringify({ address, city, state }) }
        ]
      })
    });
    if (!response.ok) throw new Error(`OpenAI returned HTTP ${response.status}`);
    const payload = JSON.parse((await response.json()).choices?.[0]?.message?.content || '{}');
    return {
      enabled: true,
      address_complete: Boolean(payload.address_complete),
      completeness: Math.max(0, Math.min(100, Number(payload.completeness ?? 50))),
      normalized_address: String(payload.normalized_address ?? address),
      issues: Array.isArray(payload.issues) ? payload.issues.slice(0, 5).map(String) : [],
      confidence: Math.max(0, Math.min(1, Number(payload.confidence ?? 0)))
    };
  } catch (error) {
    return { enabled: false, error: error.message, note: 'AI review failed safely; the regular decision engine was used.' };
  }
}

export function applyAddressAdjustment(risk, review) {
  if (!review?.enabled || review.confidence < 0.75) return risk;
  const delta = review.address_complete ? -0.03 : 0.08;
  return Math.max(0.01, Math.min(0.99, risk + delta));
}

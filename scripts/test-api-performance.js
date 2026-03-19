"use strict";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

function unwrapSuccessPayload(payload) {
  return payload?.ok === true && Object.prototype.hasOwnProperty.call(payload, "data")
    ? payload.data
    : payload;
}

async function timedPost(name, endpoint, payload) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(t);

    const ms = Date.now() - start;
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      console.error(
        `ERR ${name}: ${ms}ms | status=${res.status} | body=${text.slice(
          0,
          200
        )}...\n`
      );
      return;
    }

    const normalized = unwrapSuccessPayload(data);
    const fr = normalized.finish_reason || normalized.finishReason || "n/a";
    console.log(`OK ${name}: ${ms}ms | finish_reason=${fr}`);
    console.log(`sample: ${JSON.stringify(normalized).slice(0, 200)}...\n`);
  } catch (e) {
    const ms = Date.now() - start;
    console.error(`ERR ${name}: ${ms}ms | ${e.name} ${e.message}\n`);
  }
}

(async () => {
  console.log("Diagnóstico de rendimiento:\n");

  await timedPost("Chat Completion (no stream)", "/api/chat/completion", {
    messages: [{ role: "user", content: "Explica en 3 frases qué es la fotosíntesis." }],
    provider: "openai",
    model: "gpt-3.5-turbo",
    max_tokens: 512,
    stream: false,
  });

  await timedPost("Text Analysis", "/api/analysis/text", {
    texto: "La fotosíntesis es un proceso biológico de plantas que convierte la luz en energía química y sostiene buena parte de las cadenas tróficas terrestres.",
    api: "smart",
  });
})();

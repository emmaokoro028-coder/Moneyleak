// MoneyLeak AI Voice Backend
// Secure server-side bridge between MoneyLeak and OpenAI.
//
// IMPORTANT:
// The OpenAI API key must NEVER be placed in app.js.
// Add OPENAI_API_KEY as a Vercel Environment Variable.

const ALLOWED_ORIGIN =
  "https://emmaokoro028-coder.github.io";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

export default async function handler(request) {
  // Handle browser CORS preflight.
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== "POST") {
    return json(
      {
        ok: false,
        error: "Only POST requests are allowed.",
      },
      405
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return json(
      {
        ok: false,
        error: "OPENAI_API_KEY is not configured on the server.",
      },
      500
    );
  }

  try {
    const form = await request.formData();

    const audio = form.get("audio");
    const contextRaw = form.get("context");

    if (!audio || typeof audio === "string") {
      return json(
        {
          ok: false,
          error: "No audio recording was received.",
        },
        400
      );
    }

    // Limit recordings to approximately 20 MB.
    if (audio.size > 20 * 1024 * 1024) {
      return json(
        {
          ok: false,
          error: "The recording is too large. Please speak for a shorter time.",
        },
        413
      );
    }

    let context = {};

    if (contextRaw) {
      try {
        context = JSON.parse(String(contextRaw));
      } catch {
        context = {};
      }
    }

    // ------------------------------------------------------------
    // 1. SPEECH → TEXT
    // ------------------------------------------------------------

    const transcriptionForm = new FormData();

    transcriptionForm.append(
      "file",
      audio,
      audio.name || "moneyleak-voice.webm"
    );

    transcriptionForm.append(
      "model",
      "gpt-4o-mini-transcribe"
    );

    transcriptionForm.append(
      "language",
      "en"
    );

    const transcriptionResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: transcriptionForm,
      }
    );

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();

      return json(
        {
          ok: false,
          error: "Speech transcription failed.",
          details: errorText,
        },
        transcriptionResponse.status
      );
    }

    const transcription =
      await transcriptionResponse.json();

    const transcript =
      String(transcription.text || "").trim();

    if (!transcript) {
      return json({
        ok: true,
        transcript: "",
        message: "I couldn't hear anything clearly.",
      });
    }

    // ------------------------------------------------------------
    // 2. TRANSCRIPT → MONEY COMMAND
    // ------------------------------------------------------------

    const safeContext = {
      currency: context.currency || "NGN",
      currentPage: context.currentPage || "dashboard",
      transactions: Array.isArray(context.transactions)
        ? context.transactions.slice(0, 100)
        : [],
      goals: Array.isArray(context.goals)
        ? context.goals.slice(0, 30)
        : [],
      monthlyBudget:
        Number(context.monthlyBudget) || 0,
      categoryBudgets:
        context.categoryBudgets || {},
    };

    const systemPrompt = `
You are MoneyLeak AI, an intelligent personal finance assistant.

Your job is to understand the user's spoken financial request and
return ONLY valid JSON.

You are NOT allowed to directly change money data.
You only describe the intended action.
The MoneyLeak browser application will ask for confirmation before
performing any money-changing action.

Possible intent values:

"action"
"query"
"navigation"
"unknown"

For actions, use one of:

"add_expense"
"add_income"
"delete_transaction"
"create_goal"
"set_monthly_budget"
"set_category_budget"

For navigation, use:

"dashboard"
"income"
"expenses"
"budgets"
"savings"
"recurring"
"analytics"
"settings"

For queries, understand natural language such as:

- spending this month
- income this month
- balance
- financial health
- savings rate
- safe to spend
- biggest expense
- top spending category
- recent transactions
- goal progress
- monthly budget

MoneyLeak uses Nigerian Naira by default.

Interpret spoken amounts intelligently.

Examples:

"five thousand" = 5000
"5k" = 5000
"five grand" = 5000
"two hundred thousand" = 200000
"1.5 million" = 1500000

Categories may include:

Food
Transport
Housing
Utilities
Shopping
Entertainment
Health
Education
Bills
Subscriptions
Travel
Family
Personal
Other

For an expense:

{
  "intent": "action",
  "action": "add_expense",
  "amount": 5000,
  "category": "Food",
  "description": "food",
  "requiresConfirmation": true
}

For income:

{
  "intent": "action",
  "action": "add_income",
  "amount": 10000,
  "source": "Other income",
  "description": "business income",
  "requiresConfirmation": true
}

For a query:

{
  "intent": "query",
  "query": "spending_this_month",
  "requiresConfirmation": false
}

For navigation:

{
  "intent": "navigation",
  "page": "analytics",
  "requiresConfirmation": false
}

If information is missing for an action, don't invent it.
Return:

{
  "intent": "unknown",
  "message": "I need a little more information."
}

Always return valid JSON.
Do not use markdown.
`;

    const userPrompt = `
Current MoneyLeak context:

${JSON.stringify(safeContext)}

User said:

"${transcript}"

Return the correct JSON command.
`;

    const aiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5",
          instructions: systemPrompt,
          input: userPrompt,
          max_output_tokens: 500,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();

      return json(
        {
          ok: false,
          transcript,
          error: "MoneyLeak AI could not understand the command.",
          details: errorText,
        },
        aiResponse.status
      );
    }

    const aiData = await aiResponse.json();

    const outputText =
      aiData.output_text ||
      "";

    let command;

    try {
      command = JSON.parse(outputText);
    } catch {
      // Attempt to recover JSON if the model wrapped it in text.
      const match =
        outputText.match(/\{[\s\S]*\}/);

      if (match) {
        try {
          command = JSON.parse(match[0]);
        } catch {
          command = {
            intent: "unknown",
            message:
              "I understood your request, but I couldn't safely turn it into an action.",
          };
        }
      } else {
        command = {
          intent: "unknown",
          message:
            "I couldn't safely understand that request.",
        };
      }
    }

    return json({
      ok: true,
      transcript,
      command,
    });
  } catch (error) {
    console.error("MoneyLeak voice error:", error);

    return json(
      {
        ok: false,
        error:
          error?.message ||
          "Unexpected MoneyLeak voice server error.",
      },
      500
    );
  }
}

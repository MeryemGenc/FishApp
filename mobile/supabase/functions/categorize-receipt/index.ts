const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_CATEGORIES = ['Market', 'Food', 'Transport', 'Other'] as const;
const DEFAULT_MODEL = 'gpt-5.2';

type CategoryRequest = {
  merchant?: string | null;
  rawText?: string | null;
};

type CategoryResponse = {
  category: string;
  confidence: number;
  provider: string;
  reason?: string;
};

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function fallbackResponse(reason: string): CategoryResponse {
  return {
    category: 'Other',
    confidence: 0.4,
    provider: 'ai-fallback-disabled',
    reason,
  };
}

function getOutputText(data: OpenAiResponse) {
  if (data.output_text) {
    return data.output_text;
  }

  return data.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? '')
    .join('')
    .trim();
}

function parseCategoryResponse(text: string): CategoryResponse {
  const parsed = JSON.parse(text) as Partial<CategoryResponse>;
  const category = ALLOWED_CATEGORIES.find((allowedCategory) => allowedCategory === parsed.category) ?? 'Other';
  const confidence =
    typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.65;

  return {
    category,
    confidence,
    provider: 'openai',
    reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
  };
}

async function categorizeWithOpenAi(requestBody: CategoryRequest, apiKey: string) {
  const model = Deno.env.get('OPENAI_CATEGORY_MODEL') ?? DEFAULT_MODEL;
  const merchant = requestBody.merchant?.trim() || 'Unknown';
  const rawText = requestBody.rawText?.slice(0, 4000) ?? '';

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions:
        'You categorize receipt spending. Choose exactly one category from: Market, Food, Transport, Other. Return only valid JSON.',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Merchant: ${merchant}\nReceipt OCR context:\n${rawText}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'receipt_category',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              category: {
                type: 'string',
                enum: ALLOWED_CATEGORIES,
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
              },
              reason: {
                type: 'string',
              },
            },
            required: ['category', 'confidence', 'reason'],
          },
        },
      },
    }),
  });

  const data = (await response.json()) as OpenAiResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `OpenAI request failed with status ${response.status}.`);
  }

  const outputText = getOutputText(data);

  if (!outputText) {
    throw new Error('OpenAI response did not include output text.');
  }

  return parseCategoryResponse(outputText);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const requestBody = (await request.json()) as CategoryRequest;
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAiApiKey) {
      return jsonResponse(fallbackResponse('OPENAI_API_KEY is not configured.'));
    }

    try {
      return jsonResponse(await categorizeWithOpenAi(requestBody, openAiApiKey));
    } catch (error) {
      return jsonResponse(
        fallbackResponse(error instanceof Error ? error.message : 'AI category fallback failed.'),
      );
    }
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Category function failed.',
      },
      500,
    );
  }
});

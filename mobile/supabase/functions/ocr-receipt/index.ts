const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MOCK_RECEIPT_TEXT = `SOK MARKET
TARIH: 12.04.2026
EKMEK 12.50 TL
SUT 38.75 TL
YUMURTA 78.90 TL
TOPLAM 130.15 TL`;

type OcrRequest = {
  imageUrl?: string;
};

type GoogleVisionResponse = {
  error?: {
    message?: string;
  };
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string;
    };
    error?: {
      message?: string;
    };
  }>;
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

async function extractTextWithGoogleVision(imageUrl: string, apiKey: string) {
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          image: {
            source: {
              imageUri: imageUrl,
            },
          },
          features: [
            {
              type: 'TEXT_DETECTION',
            },
          ],
        },
      ],
    }),
  });

  const data = (await response.json()) as GoogleVisionResponse;

  if (!response.ok) {
    const message = data.error?.message ?? `Google Vision request failed with status ${response.status}.`;
    throw new Error(message);
  }

  const visionError = data.responses?.[0]?.error?.message;

  if (visionError) {
    throw new Error(visionError);
  }

  return data.responses?.[0]?.fullTextAnnotation?.text?.trim() ?? '';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const { imageUrl } = (await request.json()) as OcrRequest;

    if (!imageUrl) {
      return jsonResponse({
        rawText: MOCK_RECEIPT_TEXT,
        provider: 'edge-mock',
        reason: 'No imageUrl was provided.',
      });
    }

    const googleVisionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');

    if (!googleVisionApiKey) {
      return jsonResponse({
        rawText: MOCK_RECEIPT_TEXT,
        provider: 'edge-mock',
        reason: 'GOOGLE_VISION_API_KEY is not configured.',
      });
    }

    try {
      const rawText = await extractTextWithGoogleVision(imageUrl, googleVisionApiKey);

      return jsonResponse({
        rawText,
        provider: 'google-vision',
      });
    } catch (error) {
      return jsonResponse({
        rawText: MOCK_RECEIPT_TEXT,
        provider: 'edge-mock',
        reason: error instanceof Error ? error.message : 'Google Vision OCR failed.',
      });
    }
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'OCR function failed.',
      },
      500,
    );
  }
});

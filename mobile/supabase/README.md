# Supabase Setup

Day 1 needs a Supabase project with Auth enabled and the first database table.
Day 4 also needs a Storage bucket for receipt photos.
Day 5 uses a mock OCR service until Google Cloud Vision credentials are added.
Day 6 parses OCR text into merchant, total amount, and receipt date.
Day 7 saves processed receipts into the `receipts` table.
Day 8 adds receipt category/confidence fields and a shared `categories` table.
Day 8 also adds an `ocr-receipt` Edge Function for Google Vision OCR.
Day 9 assigns receipt categories with a rule-based categorizer.

1. Create a new Supabase project.
2. Enable Email/Password under Authentication > Providers.
3. Run `supabase/schema.sql` in the SQL editor.
4. Copy `mobile/.env.example` to `mobile/.env`.
5. Fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

The mobile app already has a Supabase client at `src/lib/supabase.ts`.
Receipt photos upload to the `receipt-images` bucket using `userId/timestamp.jpg` paths.
OCR is isolated in `src/services/receiptOcr.ts` so the mock implementation can be replaced
with Google Cloud Vision without changing the UI flow.
The mobile OCR service first tries the `ocr-receipt` Edge Function when an uploaded image URL
is available, then falls back to local mock OCR if the function is unavailable.
Parsing is isolated in `src/services/receiptParser.ts` and currently uses simple rules
for MVP receipt formats.
Categorization is isolated in `src/services/receiptCategorizer.ts`.
Database persistence is isolated in `src/services/receiptRepository.ts`.
Run `supabase/schema.sql` again after Day 8 to add the new scalable data model fields.

## OCR Edge Function

Deploy the function after Supabase CLI is available:

```bash
supabase functions deploy ocr-receipt
```

The function works as an Edge mock until `GOOGLE_VISION_API_KEY` is configured as a Supabase
Function secret. Once the secret exists, it calls Google Vision with the uploaded receipt URL.

import { KNOWN_MERCHANTS, MARKET_CONTEXT_KEYWORDS } from './receiptMerchants';
import type { ParsedReceipt } from './receiptParser';

type RuleCategoryResult = {
  receipt: ParsedReceipt;
  matched: boolean;
};

function normalizeText(value: string) {
  return value
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function includesKeyword(value: string, keyword: string) {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^A-Z0-9])${escapedKeyword}([^A-Z0-9]|$)`).test(value);
}

export function categorizeReceiptWithRules(receipt: ParsedReceipt): RuleCategoryResult {
  const normalizedMerchant = normalizeText(receipt.merchant ?? '');
  const normalizedRawText = normalizeText(receipt.rawText);

  const match = KNOWN_MERCHANTS.find((rule) =>
    rule.keywords.some((keyword) => includesKeyword(normalizedMerchant, normalizeText(keyword))),
  );

  if (match) {
    return {
      receipt: {
        ...receipt,
        category: match.category,
        confidence: 0.9,
      },
      matched: true,
    };
  }

  const hasMarketContext = MARKET_CONTEXT_KEYWORDS.some((keyword) =>
    includesKeyword(`${normalizedMerchant}\n${normalizedRawText}`, normalizeText(keyword)),
  );

  if (hasMarketContext) {
    return {
      receipt: {
        ...receipt,
        category: 'Market',
        confidence: 0.65,
      },
      matched: true,
    };
  }

  return {
    receipt: {
      ...receipt,
      category: 'Other',
      confidence: 0.4,
    },
    matched: false,
  };
}

export function categorizeReceipt(receipt: ParsedReceipt): ParsedReceipt {
  return categorizeReceiptWithRules(receipt).receipt;
}

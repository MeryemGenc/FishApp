import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { categorizeReceipt } from './receiptCategorizer';
import { parseReceipt } from './receiptParser';

type ReceiptParserCase = {
  fileName: string;
  expected: {
    merchant: string | null;
    totalAmount: number | null;
    taxAmount?: number | null;
    taxRate?: number | null;
    date: string | null;
    category: string | null;
  };
};

const CASES: ReceiptParserCase[] = [
  {
    fileName: 'test1.txt',
    expected: {
      merchant: 'BIM',
      totalAmount: 188,
      taxAmount: 12.13,
      taxRate: 20,
      date: '2026-04-28',
      category: 'Market',
    },
  },
  {
    fileName: 'test2.txt',
    expected: {
      merchant: 'GULMAR',
      totalAmount: 1137.72,
      taxAmount: 11.26,
      taxRate: null,
      date: '2026-04-30',
      category: 'Market',
    },
  },
  {
    fileName: 'test3.txt',
    expected: {
      merchant: 'A101',
      totalAmount: 609,
      taxAmount: 6.03,
      taxRate: 1,
      date: '2026-04-30',
      category: 'Market',
    },
  },
  {
    fileName: 'test4.txt',
    expected: {
      merchant: 'SOK MARKET',
      totalAmount: 100,
      taxAmount: 16.67,
      taxRate: 20,
      date: '2026-05-01',
      category: 'Market',
    },
  },
  {
    fileName: 'test5.txt',
    expected: {
      merchant: 'SOK MARKET',
      totalAmount: 205.75,
      taxAmount: 65.27,
      taxRate: null,
      date: '2026-05-04',
      category: 'Market',
    },
  },
];

function getFixtureText(fileName: string) {
  const fixturePath = resolve(__dirname, '../../..', 'test', fileName);
  const content = readFileSync(fixturePath, 'utf8');

  return content.split(/App'in/i)[0].replace(/^OCR metni:\s*/i, '').trim();
}

describe('receipt parser with real OCR fixtures', () => {
  it.each(CASES)('parses $fileName', ({ fileName, expected }) => {
    const parsedReceipt = categorizeReceipt(parseReceipt(getFixtureText(fileName)));

    expect(parsedReceipt).toMatchObject(expected);
  });
});

describe('receipt category fallback rules', () => {
  it('categorizes unknown merchants with market context as Market', () => {
    const parsedReceipt = categorizeReceipt(
      parseReceipt(`YENI MAHALLE GIDA MARKET
TARIH: 04/05/2026
TOPLAM 125.00 TL`),
    );

    expect(parsedReceipt).toMatchObject({
      merchant: 'YENI MAHALLE GIDA MARKET',
      category: 'Market',
      confidence: 0.65,
    });
  });

  it('keeps unknown merchants without category signals as Other', () => {
    const parsedReceipt = categorizeReceipt(
      parseReceipt(`ABC HIZMET LTD
TARIH: 04/05/2026
TOPLAM 125.00 TL`),
    );

    expect(parsedReceipt).toMatchObject({
      merchant: 'ABC HIZMET LTD',
      category: 'Other',
      confidence: 0.4,
    });
  });
});

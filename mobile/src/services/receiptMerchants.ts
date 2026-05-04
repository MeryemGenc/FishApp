export type MerchantCategory = 'Market' | 'Food' | 'Transport';

export type KnownMerchant = {
  keywords: string[];
  merchant: string;
  category: MerchantCategory;
};

export const KNOWN_MERCHANTS: KnownMerchant[] = [
  {
    keywords: ['MIGROS', 'MIGROS TICARET'],
    merchant: 'MIGROS',
    category: 'Market',
  },
  {
    keywords: ['BIM', 'BIM BIRLESIK MAGAZALAR'],
    merchant: 'BIM',
    category: 'Market',
  },
  {
    keywords: ['GULMAR'],
    merchant: 'GULMAR',
    category: 'Market',
  },
  {
    keywords: ['SOK', 'SOK MARKET', 'SOK MARKETLER'],
    merchant: 'SOK MARKET',
    category: 'Market',
  },
  {
    keywords: ['A101', 'A 101'],
    merchant: 'A101',
    category: 'Market',
  },
  {
    keywords: ['CARREFOURSA'],
    merchant: 'CARREFOURSA',
    category: 'Market',
  },
  {
    keywords: ['BIZIM TOPTAN'],
    merchant: 'BIZIM TOPTAN',
    category: 'Market',
  },
  {
    keywords: ['HAKMAR'],
    merchant: 'HAKMAR',
    category: 'Market',
  },
  {
    keywords: ['FILE'],
    merchant: 'FILE',
    category: 'Market',
  },
  {
    keywords: ['GETIR'],
    merchant: 'GETIR',
    category: 'Market',
  },
  {
    keywords: ['STARBUCKS'],
    merchant: 'STARBUCKS',
    category: 'Food',
  },
  {
    keywords: ['YEMEKSEPETI'],
    merchant: 'YEMEKSEPETI',
    category: 'Food',
  },
  {
    keywords: ['MCDONALDS', "MCDONALD'S"],
    merchant: 'MCDONALDS',
    category: 'Food',
  },
  {
    keywords: ['BURGER KING'],
    merchant: 'BURGER KING',
    category: 'Food',
  },
  {
    keywords: ['KFC'],
    merchant: 'KFC',
    category: 'Food',
  },
  {
    keywords: ['POPEYES'],
    merchant: 'POPEYES',
    category: 'Food',
  },
  {
    keywords: ['UBER'],
    merchant: 'UBER',
    category: 'Transport',
  },
];

export const MARKET_CONTEXT_KEYWORDS = ['MARKET', 'GIDA', 'SUPERMARKET'];

import { db } from './firebase';
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';

const CATEGORY_MAP: { [key: string]: string } = {
  'bookshelf': '01',
  'shoe shelf': '02',
  'shoe rack': '02',
  'sofa table': '03',
  'baby bed': '04',
  'crib': '04',
  '150 bed': '05',
  'queen bed': '05',
  'bunk bed': '06',
  'single bed': '07',
  'coffee table': '08',
  'drawer': '09',
  'chest': '09',
  'tv stand': '10',
  'tv unit': '10',
  'dressing table': '11',
  'dresser': '11',
  'bedside table': '12',
  'nightstand': '12',
  'office furniture': '13',
  'office chair': '13',
  'office desk': '13',
  'sofa side table': '14',
  'coat hanger': '15',
  'study table': '16',
  'desk': '16',
  'wardrobe': '17',
  'closet': '17',
  'carpet': '18',
  'reception': '19',
  'home office': '20',
  'kitchen': '21',
  'door': '22'
};

/**
 * Matches a raw product name to a 2-digit category code.
 */
export function getCategoryCode(rawProductName: string): string | null {
  const name = rawProductName.toLowerCase();
  for (const [keyword, code] of Object.entries(CATEGORY_MAP)) {
    if (name.includes(keyword)) {
      return code;
    }
  }
  return null;
}

/**
 * Initializes all SKU counters to 20 in Firestore.
 */
export async function initSkuCounters() {
  const counters: { [key: string]: number } = {};
  for (let i = 1; i <= 22; i++) {
    const code = i.toString().padStart(2, '0');
    counters[code] = 20;
  }
  await setDoc(doc(db, 'skuCounters', 'counters'), counters);
}

/**
 * Gets the next unique SKU for a given category code using an atomic transaction.
 * If the document doesn't exist, it initializes it automatically within the transaction.
 * Format: ZF + 2-digit category code + 2-digit sequence number.
 */
export async function getNextSku(categoryCode: string): Promise<string> {
  const counterRef = doc(db, 'skuCounters', 'counters');

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    
    let counters: { [key: string]: number };
    let currentCount: number;

    if (!counterDoc.exists()) {
      // Document missing: Initialize counters
      counters = {};
      for (let i = 1; i <= 22; i++) {
        const code = i.toString().padStart(2, '0');
        counters[code] = 20;
      }
      currentCount = 20;
      counters[categoryCode] = currentCount + 1;
      transaction.set(counterRef, counters);
    } else {
      counters = counterDoc.data() as { [key: string]: number };
      currentCount = counters[categoryCode] ?? 20;
      const nextCount = currentCount + 1;
      transaction.update(counterRef, {
        [categoryCode]: nextCount
      });
    }

    const sequence = currentCount.toString().padStart(2, '0');
    return `ZF${categoryCode}${sequence}`;
  });
}

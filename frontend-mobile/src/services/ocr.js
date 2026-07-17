/**
 * OCR Service, Provider-abstracted receipt text extraction.
 *
 * Current provider: OCR.space (free tier, 25K calls/month)
 * Future:           Google Cloud Vision API (swap providerExtract only)
 *
 * Architecture:
 *   extractText(imageUri)   --> { rawText, confidence }
 *   parseReceiptText(raw)   --> { merchant, amount, date, items, category }
 *
 * To switch providers later, replace the `providerExtract` function.
 */

import { config } from '../utils/config';

// Provider config (loaded from environment — never hardcode keys!)
const OCR_SPACE_API_KEY = config.OCR_SPACE_API_KEY;
const OCR_SPACE_URL = config.OCR_SPACE_URL;

// Provider: OCR.space
async function ocrSpaceExtract(imageUri) {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'receipt.jpg';
  const ext = filename.split('.').pop().toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  formData.append('file', { uri: imageUri, name: filename, type: mimeType });
  formData.append('apikey', OCR_SPACE_API_KEY);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2'); // Engine 2 is better for receipts

  const response = await fetch(OCR_SPACE_URL, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`OCR API returned ${response.status}`);
  }

  const result = await response.json();

  if (result.IsErroredOnProcessing) {
    throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed');
  }

  const parsed = result.ParsedResults?.[0];
  if (!parsed || !parsed.ParsedText) {
    throw new Error('No text could be extracted from the image');
  }

  return {
    rawText: parsed.ParsedText,
    confidence: parsed.TextOverlay?.confidence ?? null,
    exitCode: result.OCRExitCode,
  };
}

// Provider: Google Cloud Vision (future)
// async function googleVisionExtract(imageUri) {
//   // 1. Convert image to base64
//   // 2. POST to https://vision.googleapis.com/v1/images:annotate
//   // 3. Return { rawText, confidence }
//   throw new Error('Google Vision provider not yet configured');
// }

// Active provider (swap this one line to change providers)
const providerExtract = ocrSpaceExtract;

// Public API

/**
 * Extract text from a receipt image.
 * @param {string} imageUri — local file URI from camera/gallery
 * @returns {Promise<{ rawText: string, confidence: number|null }>}
 */
export async function extractText(imageUri) {
  return providerExtract(imageUri);
}

/**
 * Parse raw OCR text into structured receipt data.
 * Uses pattern matching for amounts, dates, merchant, and line items.
 */
export function parseReceiptText(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  // Merchant (usually the first meaningful line)
  let merchant = '';
  for (const line of lines.slice(0, 5)) {
    // Skip lines that look like dates, numbers, or addresses only
    if (/^\d{1,2}[\/\-]/.test(line)) continue;
    if (/^[\d\s,.$Rs₹]+$/.test(line)) continue;
    if (line.length < 2) continue;
    merchant = line;
    break;
  }

  // Total amount
  let amount = null;
  const totalPatterns = [
    /(?:grand\s*)?total[\s:]*[Rs.$₹]*\s*([\d,]+\.?\d*)/i,
    /(?:amount\s*(?:due|paid|payable))[\s:]*[Rs.$₹]*\s*([\d,]+\.?\d*)/i,
    /(?:net\s*(?:amount|total))[\s:]*[Rs.$₹]*\s*([\d,]+\.?\d*)/i,
    /(?:subtotal|sub\s*total)[\s:]*[Rs.$₹]*\s*([\d,]+\.?\d*)/i,
    /(?:balance\s*due)[\s:]*[Rs.$₹]*\s*([\d,]+\.?\d*)/i,
  ];

  // Search bottom-up for total (receipts put totals near the end)
  for (const line of [...lines].reverse()) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    if (amount) break;
  }

  // Fallback: find the largest decimal number
  if (!amount) {
    let maxNum = 0;
    for (const line of lines) {
      const nums = line.match(/[\d,]+\.\d{2}/g);
      if (nums) {
        for (const n of nums) {
          const val = parseFloat(n.replace(/,/g, ''));
          if (val > maxNum && val < 1000000) maxNum = val;
        }
      }
    }
    if (maxNum > 0) amount = maxNum;
  }

  // Date
  let date = null;
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
    /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*[\s.]+\d{1,2},?\s+\d{4})/i,
    /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*[\s.,]+\d{4})/i,
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) { date = match[1]; break; }
    }
    if (date) break;
  }

  // Line items (lines ending with a price or containing a price-like number)
  const items = [];
  for (const line of lines) {
    // Matches "Item Name 123.45" or "Item Name 123"
    const priceMatch = line.match(/^(.+?)\s+([\d,]+\.?\d*)\s*$/);
    if (priceMatch && priceMatch[1].length > 1) {
      const name = priceMatch[1].replace(/[\.\-]+$/, '').trim();
      const priceVal = priceMatch[2].replace(/,/g, '');
      const price = parseFloat(priceVal);
      // Basic sanity check: avoid matching dates or years as prices
      if (name && price > 0 && price < 100000 && !/^\d{4}$/.test(priceVal)) {
        items.push({ name, price });
      }
    }
  }

  // Category suggestion
  const category = suggestCategory(rawText, merchant);

  return { merchant, amount, date, items, category, rawText };
}

/**
 * Suggest an expense category based on OCR text content.
 */
export function suggestCategory(text, merchant = '') {
  const lower = (text + ' ' + merchant).toLowerCase();

  const categoryKeywords = {
    'Food & Dining': [
      'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'food', 'eat',
      'dine', 'kitchen', 'bakery', 'momo', 'dal bhat', 'thakali',
      'chowmein', 'starbucks', 'kfc', 'mcdonalds', 'subway',
    ],
    Groceries: [
      'grocery', 'supermarket', 'mart', 'store', 'bhatbhateni', 'bigmart',
      'salesberry', 'fresh', 'vegetables', 'fruits', 'dairy', 'meat',
    ],
    Transport: [
      'fuel', 'petrol', 'gas station', 'parking', 'uber', 'taxi', 'bus',
      'ride', 'pathao', 'indrive', 'toll', 'flight', 'airline',
    ],
    Shopping: [
      'mall', 'shop', 'fashion', 'clothing', 'electronics', 'daraz',
      'amazon', 'flipkart', 'accessory', 'jewel',
    ],
    Utilities: [
      'electric', 'water', 'internet', 'phone', 'bill', 'nea', 'ntc',
      'ncell', 'worldlink', 'vianet', 'recharge',
    ],
    Health: [
      'pharmacy', 'hospital', 'clinic', 'medical', 'health', 'doctor',
      'medicine', 'lab', 'dental', 'optical',
    ],
    Education: [
      'school', 'college', 'university', 'book', 'tuition', 'course',
      'stationery', 'library',
    ],
    Entertainment: [
      'movie', 'cinema', 'theatre', 'game', 'qfx', 'fcube', 'concert',
      'event', 'ticket',
    ],
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return 'Other';
}

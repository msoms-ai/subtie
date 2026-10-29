import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readTransactions() {
  try {
    if (!fs.existsSync(TRANSACTIONS_FILE)) {
      fs.writeFileSync(TRANSACTIONS_FILE, '{}', 'utf8');
      return {};
    }
    return JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
  } catch (err) {
    console.error('[PaymentService] Error reading transactions:', err);
    return {};
  }
}

function writeTransactions(data) {
  try {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[PaymentService] Error writing transactions:', err);
  }
}

function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (err) {
    return {};
  }
}

function writeUsers(data) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[PaymentService] Error writing users:', err);
  }
}

// ====================================================
// OFFICIAL SUBTIE PACKAGES CATALOGUE (PRICED IN AED / FILS)
// Ziina Minimum is 200 fils (2.00 AED)
// ====================================================

export const PACKAGES = {
  // Episodes
  ep_single: {
    id: 'ep_single',
    category: 'episodes',
    titleAr: 'حلقة واحدة',
    titleEn: 'Single Episode',
    minutes: 25,
    priceAed: 4.00,
    amountFils: 400,
    priceDisplay: '4.00 د.إ',
    priceDisplayEn: '4.00 AED',
    color: 'from-indigo-600 to-blue-500',
    popular: false,
    featuresAr: ['يكفي لترجمة حلقة واحدة كاملة', 'صلاحية رصيد غير محدودة', 'دقة بالغة بالذكاء الاصطناعي'],
    featuresEn: ['Transcribes 1 full episode', 'Unlimited credit validity', 'Gemini AI ultra-high accuracy']
  },
  ep_season: {
    id: 'ep_season',
    category: 'episodes',
    titleAr: 'موسم كامل (12 حلقة)',
    titleEn: 'Full Season (12 Eps)',
    minutes: 300,
    priceAed: 39.00,
    amountFils: 3900,
    priceDisplay: '39.00 د.إ',
    priceDisplayEn: '39.00 AED',
    color: 'from-indigo-600 to-blue-500',
    popular: true,
    featuresAr: ['توفير كبير مقارنة بشراء الحلقات الفردية', 'صلاحية رصيد غير محدودة', 'أولوية معالجة في طابور السيرفر'],
    featuresEn: ['Major savings vs single episodes', 'Unlimited validity', 'Priority queue processing']
  },

  // Movies
  mov_single: {
    id: 'mov_single',
    category: 'movies',
    titleAr: 'تذكرة فيلم أنمي',
    titleEn: 'Anime Movie Ticket',
    minutes: 100,
    priceAed: 12.00,
    amountFils: 1200,
    priceDisplay: '12.00 د.إ',
    priceDisplayEn: '12.00 AED',
    color: 'from-amber-500 to-orange-500',
    popular: false,
    featuresAr: ['يكفي لترجمة فيلم أنمي طويل متكامل', 'معالجة صوتيات معقدة ومؤثرات سينمائية', 'صلاحية غير محدودة'],
    featuresEn: ['Transcribes 1 feature-length movie', 'Complex cinematic audio parsing', 'Unlimited validity']
  },
  mov_pack: {
    id: 'mov_pack',
    category: 'movies',
    titleAr: 'باقة 3 أفلام',
    titleEn: 'Movie Trilogy Pack',
    minutes: 300,
    priceAed: 35.00,
    amountFils: 3500,
    priceDisplay: '35.00 د.إ',
    priceDisplayEn: '35.00 AED',
    color: 'from-amber-500 to-orange-500',
    popular: false,
    featuresAr: ['ترجمة 3 أفلام متكاملة', 'أولوية معالجة فائقة', 'أفضل قيمة لعشاق الأفلام'],
    featuresEn: ['Transcribes 3 full movies', 'Ultra-high priority processing', 'Best value for movies']
  },

  // Trailers & Clips
  tr_single: {
    id: 'tr_single',
    category: 'trailers',
    titleAr: 'مقطع دعائي واحد',
    titleEn: 'Single Trailer',
    minutes: 10,
    priceAed: 2.00, // Meets Ziina min requirement of 2.00 AED
    amountFils: 200,
    priceDisplay: '2.00 د.إ',
    priceDisplayEn: '2.00 AED',
    color: 'from-emerald-500 to-teal-500',
    popular: false,
    featuresAr: ['يكفي لفيديو قصير أو تريلر حتى 10 دقائق', 'معالجة فورية سريعة جداً', 'صلاحية غير محدودة'],
    featuresEn: ['Perfect for short clip/trailer up to 10m', 'Instant processing', 'Unlimited validity']
  },
  tr_pack: {
    id: 'tr_pack',
    category: 'trailers',
    titleAr: 'باقة 5 مقاطع',
    titleEn: '5 Trailers Pack',
    minutes: 25,
    priceAed: 4.00,
    amountFils: 400,
    priceDisplay: '4.00 د.إ',
    priceDisplayEn: '4.00 AED',
    color: 'from-emerald-500 to-teal-500',
    popular: false,
    featuresAr: ['وفر مع باقة المقاطع الدعائية المتعددة', 'صلاحية رصيد غير محدودة', 'دعم الفيديوهات القصيرة و AMVs'],
    featuresEn: ['Save on multiple trailers', 'Unlimited validity', 'Supports AMVs and short promos']
  }
};

/**
 * Calculates custom bulk tier
 */
export function calculateBulkTier(minutes) {
  const mins = parseInt(minutes, 10) || 500;
  if (mins === 500) {
    return {
      id: 'bulk_500',
      category: 'bulk',
      titleAr: 'باقة مخصصة (500 دقيقة)',
      titleEn: 'Bulk Package (500 Mins)',
      minutes: 500,
      priceAed: 49.00,
      amountFils: 4900,
      priceDisplay: '49.00 د.إ',
      priceDisplayEn: '49.00 AED'
    };
  }
  if (mins === 1000) {
    return {
      id: 'bulk_1000',
      category: 'bulk',
      titleAr: 'باقة مخصصة (1,000 دقيقة)',
      titleEn: 'Bulk Package (1,000 Mins)',
      minutes: 1000,
      priceAed: 89.00,
      amountFils: 8900,
      priceDisplay: '89.00 د.إ',
      priceDisplayEn: '89.00 AED'
    };
  }
  if (mins === 1500) {
    return {
      id: 'bulk_1500',
      category: 'bulk',
      titleAr: 'باقة مخصصة (1,500 دقيقة)',
      titleEn: 'Bulk Package (1,500 Mins)',
      minutes: 1500,
      priceAed: 129.00,
      amountFils: 12900,
      priceDisplay: '129.00 د.إ',
      priceDisplayEn: '129.00 AED'
    };
  }
  if (mins === 2000) {
    return {
      id: 'bulk_2000',
      category: 'bulk',
      titleAr: 'باقة مخصصة (2,000 دقيقة)',
      titleEn: 'Bulk Package (2,000 Mins)',
      minutes: 2000,
      priceAed: 159.00,
      amountFils: 15900,
      priceDisplay: '159.00 د.إ',
      priceDisplayEn: '159.00 AED'
    };
  }

  // Fallback linear rate: ~0.10 AED per minute (min 2.00 AED / 200 fils)
  const amountFils = Math.max(200, Math.round(mins * 10));
  const priceAed = amountFils / 100;
  return {
    id: `bulk_${mins}`,
    category: 'bulk',
    titleAr: `باقة مخصصة (${mins} دقيقة)`,
    titleEn: `Bulk Package (${mins} Mins)`,
    minutes: mins,
    priceAed,
    amountFils,
    priceDisplay: `${priceAed.toFixed(2)} د.إ`,
    priceDisplayEn: `${priceAed.toFixed(2)} AED`
  };
}

/**
 * Returns the packages catalogue for frontend display
 */
export function getPackagesCatalogue() {
  return {
    episodes: [PACKAGES.ep_single, PACKAGES.ep_season],
    movies: [PACKAGES.mov_single, PACKAGES.mov_pack],
    trailers: [PACKAGES.tr_single, PACKAGES.tr_pack],
    bulkOptions: [
      calculateBulkTier(500),
      calculateBulkTier(1000),
      calculateBulkTier(1500),
      calculateBulkTier(2000)
    ]
  };
}

/**
 * Creates a Ziina Payment Intent on Ziina API
 */
export async function createPaymentIntent({ userId, packageId, customMinutes, origin }) {
  const apiKey = process.env.ZIINA_API_KEY;
  if (!apiKey) {
    throw new Error('Ziina API Key is not configured on the server (ZIINA_API_KEY).');
  }

  const users = readUsers();
  const user = users[userId];
  if (!user) {
    throw new Error('User not found. Please log in before purchasing.');
  }

  let selectedPkg = null;
  if (packageId === 'bulk' || packageId?.startsWith('bulk_')) {
    selectedPkg = calculateBulkTier(customMinutes || 500);
  } else if (PACKAGES[packageId]) {
    selectedPkg = PACKAGES[packageId];
  } else {
    throw new Error(`Invalid package selected: "${packageId}".`);
  }

  const isTestMode = process.env.ZIINA_TEST_MODE === 'true' || process.env.ZIINA_TEST_MODE === true || !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

  // Base domain for customer redirect callbacks
  const siteUrl = (origin || process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
  const successUrl = `${siteUrl}/?payment_status=success&payment_intent_id={PAYMENT_INTENT_ID}`;
  const cancelUrl = `${siteUrl}/?payment_status=cancel&payment_intent_id={PAYMENT_INTENT_ID}`;

  const requestPayload = {
    amount: selectedPkg.amountFils,
    currency_code: 'AED',
    message: `Subtie: ${selectedPkg.titleEn} (+${selectedPkg.minutes} mins)`,
    success_url: successUrl,
    cancel_url: cancelUrl,
    test: isTestMode,
    allow_tips: false
  };

  console.log(`💳 [Ziina] Creating payment intent for user ${userId} (${user.email}) - Package: ${selectedPkg.id} (${selectedPkg.amountFils} fils, test=${isTestMode})...`);

  const ziinaRes = await fetch('https://api-v2.ziina.com/api/payment_intent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestPayload)
  });

  const responseData = await ziinaRes.json();

  if (!ziinaRes.ok || !responseData?.id || !responseData?.redirect_url) {
    console.error('❌ [Ziina API Error]:', responseData);
    throw new Error(responseData?.message || responseData?.error || 'Failed to initiate payment with Ziina.');
  }

  // Record transaction in transactions.json
  const transactions = readTransactions();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  transactions[responseData.id] = {
    txId,
    paymentIntentId: responseData.id,
    userId,
    userEmail: user.email,
    packageId: selectedPkg.id,
    packageTitleAr: selectedPkg.titleAr,
    packageTitleEn: selectedPkg.titleEn,
    minutes: selectedPkg.minutes,
    amountFils: selectedPkg.amountFils,
    priceAed: selectedPkg.priceAed,
    currency: 'AED',
    status: responseData.status || 'requires_payment_instrument',
    test: isTestMode,
    redirectUrl: responseData.redirect_url,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  writeTransactions(transactions);

  console.log(`✅ [Ziina] Payment intent created successfully: ID=${responseData.id}`);

  return {
    success: true,
    paymentIntentId: responseData.id,
    redirectUrl: responseData.redirect_url,
    amountFils: selectedPkg.amountFils,
    priceAed: selectedPkg.priceAed,
    minutes: selectedPkg.minutes,
    packageTitleAr: selectedPkg.titleAr,
    packageTitleEn: selectedPkg.titleEn,
    test: isTestMode
  };
}

/**
 * Verifies a Ziina payment intent status and securely credits the user's minutes
 */
export async function verifyAndCreditPayment(paymentIntentId) {
  if (!paymentIntentId || !paymentIntentId.trim()) {
    throw new Error('Payment Intent ID is required for verification.');
  }

  const cleanIntentId = paymentIntentId.trim();
  const apiKey = process.env.ZIINA_API_KEY;
  if (!apiKey) {
    throw new Error('Ziina API Key is missing on the server.');
  }

  const transactions = readTransactions();
  const tx = transactions[cleanIntentId];

  if (!tx) {
    throw new Error(`Transaction record for payment intent "${cleanIntentId}" was not found.`);
  }

  const users = readUsers();
  const user = users[tx.userId];
  if (!user) {
    throw new Error(`User associated with transaction "${tx.userId}" was not found.`);
  }

  // Idempotency: If transaction is already completed, do not credit twice!
  if (tx.status === 'completed') {
    console.log(`⚡ [Ziina] Payment intent ${cleanIntentId} already verified and credited previously.`);
    return {
      success: true,
      alreadyCompleted: true,
      status: 'completed',
      minutesAdded: tx.minutes,
      minuteBalance: user.minuteBalance,
      user
    };
  }

  // Fetch live payment intent from Ziina to verify status independently
  console.log(`🔍 [Ziina] Verifying payment intent status for ${cleanIntentId} with Ziina API...`);

  const ziinaRes = await fetch(`https://api-v2.ziina.com/api/payment_intent/${encodeURIComponent(cleanIntentId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    }
  });

  const ziinaData = await ziinaRes.json();

  if (!ziinaRes.ok) {
    console.error('❌ [Ziina Verification API Error]:', ziinaData);
    throw new Error(ziinaData?.message || ziinaData?.error || 'Failed to verify payment intent with Ziina.');
  }

  console.log(`📋 [Ziina] Payment Intent ${cleanIntentId} live status is "${ziinaData.status}".`);

  // Check if status is completed
  if (ziinaData.status === 'completed') {
    // Verify amount matches exactly to prevent tampering
    if (ziinaData.amount !== tx.amountFils) {
      console.error(`🚨 [Ziina Security Warning] Amount mismatch: Expected ${tx.amountFils} fils, received ${ziinaData.amount} fils.`);
      throw new Error('Payment verification failed: Amount mismatch.');
    }

    // Credit user's wallet
    const previousBalance = user.minuteBalance || 0;
    user.minuteBalance = previousBalance + tx.minutes;
    user.hasPurchased = true;
    user.updatedAt = new Date().toISOString();
    writeUsers(users);

    // Mark transaction as completed
    tx.status = 'completed';
    tx.completedAt = new Date().toISOString();
    tx.ziinaSettled = ziinaData.settled || null;
    writeTransactions(transactions);

    console.log(`🎉 [Ziina] Payment Verified & Credited! User ${user.email} received +${tx.minutes} mins. New balance: ${user.minuteBalance} mins.`);

    return {
      success: true,
      status: 'completed',
      minutesAdded: tx.minutes,
      minuteBalance: user.minuteBalance,
      packageTitleAr: tx.packageTitleAr,
      packageTitleEn: tx.packageTitleEn,
      user
    };
  }

  // If status is failed or canceled
  if (ziinaData.status === 'failed' || ziinaData.status === 'canceled') {
    tx.status = ziinaData.status;
    writeTransactions(transactions);
    return {
      success: false,
      status: ziinaData.status,
      message: `Payment was ${ziinaData.status}. No minutes were charged or credited.`
    };
  }

  // Pending / processing state
  return {
    success: false,
    status: ziinaData.status || 'pending',
    message: 'Payment is still being processed.'
  };
}

/**
 * Returns transaction history for a user
 */
export function getUserTransactions(userId) {
  const transactions = readTransactions();
  return Object.values(transactions)
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export default {
  PACKAGES,
  calculateBulkTier,
  getPackagesCatalogue,
  createPaymentIntent,
  verifyAndCreditPayment,
  getUserTransactions
};

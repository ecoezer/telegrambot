import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();

const ODDS_FIX_MAP = {
    "01WQ8psWvMMRaMXD6jhu": 1.65,
    "1bN5ZsubyCZRqeXpoKhY": 1.72,
    "1jVRFZFr0tDe3y54pYGF": 1.80,
    "BP91ibyfpXNuCOdfBUHf": 1.64,
    "J7PlypcsLxPhVfR5t1lv": 1.80,
    "JChw9T85ZnE2yFyJHuso": 1.79,
    "MxZ3gmmCOI2rcNDkqVK8": 1.75,
    "NDi5mz4A5HleE4JJxHc4": 1.67,
    "TfYq1hM1VVFnNyDkG9zp": 1.94,
    "UMDoCcdhKPMEl0ignToT": 1.74,
    "WCM2APKtYsWja7Q8xJrg": 1.91,
    "WVX0aR9ayACN7XHyBqHg": 1.85,
    "aRtLfO45m47DksR73DaV": 1.65,
    "hsW8xBYT5NmLlGorigFC": 1.55,
    "kxC6rWWmbhKklTTP0GLC": 1.68,
    "pg3qXp5M3e0IkIaQfjEE": 1.85,
    "r7yKfb7yC9hl3W9jKFwG": 1.90,
    "rqmcV2Uxb4k0vvJlsPwP": 1.91,
    "wFEdm7qq4G9sAlivEZ0l": 1.88,
    "x4RklvFDrRixh8RcP37Q": 1.68,
    "zuQfRuZI3PB9oaMEP76d": 1.75
};

async function fixOdds() {
    const batch = db.batch();
    let count = 0;
    for (const [id, odds] of Object.entries(ODDS_FIX_MAP)) {
        const ref = db.collection('bets').doc(id);
        batch.update(ref, { odds: odds });
        count++;
    }
    await batch.commit();
    console.log(`✅ Fixed odds for ${count} bets.`);
    process.exit(0);
}

fixOdds().catch(console.error);

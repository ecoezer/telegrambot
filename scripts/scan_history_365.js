
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import admin from 'firebase-admin';
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import { parseBetMessage } from "../src/utils/parser.js";
import { performOCR, initOCR } from "../src/utils/ocr.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase
if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        });
    } else {
        console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT missing.");
        process.exit(1);
    }
}
const db = admin.firestore();

// Initialize Telegram Client
const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession(process.env.TELEGRAM_SESSION);

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
    useWSS: true,
});

const scanHistory365 = async () => {
    console.log("🚀 Starting Deep Scan (Last 365 Days)...");
    await client.connect();
    console.log("✅ Connected to Telegram!");

    await initOCR();

    // Pre-fetch all existing bets
    console.log("📥 Fetching existing bets from DB...");
    const existingBetsSnapshot = await db.collection('bets').get();
    const existingBetsSet = new Set();

    existingBetsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.match && data.selection) {
            // Normalize key
            const key = `${data.match.trim()}_${data.selection.trim()}`;
            existingBetsSet.add(key);
        }
    });
    console.log(`✅ Loaded ${existingBetsSet.size} existing bets to IGNORE.`);

    // Find the channel
    const dialogs = await client.getDialogs();
    let target = dialogs.find(d => d.id.toString() === "-1001359611294") ||
        dialogs.find(d => d.title === "⚡️ YRL BETS") ||
        dialogs.find(d => d.title && d.title.includes("YRL BETS"));

    if (!target) {
        console.log("⚠️ Could not find 'YRL BETS' channel.");
        process.exit(1);
    }

    console.log(`🔎 Found channel: ${target.title} (${target.id}). Scanning...`);

    const cutoffDate = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);
    const newBets = [];
    const MAX_BATCH_SIZE = 500;

    let processedCount = 0;

    // Fetch messages
    for (const message of await client.getMessages(target.inputEntity, { limit: undefined })) {
        if (message.date < cutoffDate) {
            console.log("⏹️ Reached 365-day limit. Stopping scan.");
            break;
        }

        const text = message.text || message.message || "";
        let betData = parseBetMessage(text, message.date);

        const isStrictDailyBet = text.includes("Daily BET from YRL BETS");
        const isVipSpam = text.includes("VIP Classic");

        if (isVipSpam) continue;

        // OCR Enhancements
        if (betData && message.media && ((!betData.odds || betData.odds === 0) || betData.stake === 1)) {
            // Try to recover odds via OCR if missing, but only for NEW bets logic happens later?
            // Actually, we need to know if it's new BEFORE we spend time on OCR to be efficient?
            // Check fast first?
            const potentialKey = `${betData.match.trim()}_${betData.selection.trim()}`;
            if (existingBetsSet.has(potentialKey)) {
                // process.stdout.write("s"); // skip
                continue;
            }

            // It is a NEW bet with missing info, so let's try OCR
            try {
                const ocrResult = await performOCR(client, message);
                if (ocrResult && (ocrResult.odds > 0 || ocrResult.stake > 1)) {
                    if (ocrResult.odds > 0) betData.odds = ocrResult.odds;
                    if (ocrResult.stake > 1) betData.stake = ocrResult.stake;
                }
            } catch (e) {
                // ignore
            }
        }

        // Image-only fallback
        if (!betData && message.media && isStrictDailyBet) {
            // We don't have match name yet, so we can't check duplicates efficiently without OCR.
            // We must OCR to get match name.
            const ocrResult = await performOCR(client, message);
            if (ocrResult && ocrResult.source === 'OCR') {
                betData = ocrResult;
            }
        }

        if (betData) {
            const uniqueKey = `${betData.match.trim()}_${betData.selection.trim()}`;

            if (existingBetsSet.has(uniqueKey)) {
                // STRICTLY IGNORE
                // console.log(`⏩ Skipping existing: ${betData.match}`);
            } else {
                betData.source = 'YRL_BETS_HISTORY_365';
                newBets.push(betData);
                existingBetsSet.add(uniqueKey); // Prevent db duplicates in same run
                console.log(`🆕 Found NEW bet: ${betData.match} (${betData.formattedDate})`);
            }
        }

        if (newBets.length >= 50) {
            await saveNewBets(newBets.splice(0, newBets.length));
        }

        processedCount++;
        if (processedCount % 100 === 0) process.stdout.write(`.${processedCount}`);
    }

    await saveNewBets(newBets);
    console.log("\n✅ Deep Scan Complete.");
    process.exit(0);
};

const saveNewBets = async (bets) => {
    if (bets.length === 0) return;
    console.log(`\n💾 Saving ${bets.length} NEW bets...`);
    const batch = db.batch();
    bets.forEach(bet => {
        const ref = db.collection('bets').doc();
        batch.set(ref, bet);
    });
    await batch.commit();
};

scanHistory365();

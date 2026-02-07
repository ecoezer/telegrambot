import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import admin from 'firebase-admin';
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import Tesseract from "tesseract.js";
import sharp from "sharp";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// 1. Initialize Firebase
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

// 2. Initialize Telegram Client
const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession(process.env.TELEGRAM_SESSION);

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

// 3. Parser Logic (Reused from listener.js)
const parseBetMessage = (text) => {
    // Strictly match the header from the user's image
    if (!text.includes("Daily BET from YRL BETS")) return null;

    // Check for required elements
    if (!text.includes("🔹") || !text.includes("🔸")) return null;

    const sportRegex = /(?:🏀|⚽|🎾|🏒|🎮)\s*(.+)/;
    const matchRegex = /🔹\s*(.+)/;
    const betRegex = /🔸\s*Bet:\s*(.+)((?:\n|$))/;

    const sportMatch = text.match(sportRegex);
    const matchMatch = text.match(matchRegex);
    const betMatch = text.match(betRegex);

    if (!matchMatch || !betMatch) return null;

    const selectionRaw = betMatch[1].trim();
    const oddsMatch = selectionRaw.match(/@\s*(\d+\.\d+)/) || selectionRaw.match(/(\d+\.\d+)$/);
    const parsedOdds = oddsMatch ? parseFloat(oddsMatch[1]) : 0;
    const selection = parsedOdds > 0 ? selectionRaw.replace(oddsMatch[0], '').trim() : selectionRaw;

    return {
        sport: sportMatch ? sportMatch[1].trim() : "Unknown",
        match: matchMatch[1].trim(),
        selection: selection,
        raw: text,
        timestamp: new Date().toISOString(),
        formattedDate: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
        status: 'pending',
        odds: parsedOdds,
        stake: 1
    };
};

const runScan = async () => {
    console.log("🚀 Connecting to Telegram...");
    await client.connect();
    console.log("✅ Connected!");

    console.log("📜 Starting Historic Scan (Last 90 Days)...");

    const dialogs = await client.getDialogs();

    // Priority search logic same as listener.js
    let target = dialogs.find(d => d.id.toString() === "-1001359611294");
    if (!target) target = dialogs.find(d => d.title === "⚡️ YRL BETS");
    if (!target) target = dialogs.find(d => d.title && d.title.includes("YRL BETS") && !d.title.includes("Chat"));
    if (!target) target = dialogs.find(d => d.title && d.title.includes("YRL BETS"));

    if (!target) {
        console.error("❌ Could not find target channel 'YRL BETS'.");
        await client.disconnect();
        process.exit(1);
    }

    console.log(`🔎 Found channel: ${target.title} (${target.id}). Scanning...`);

    const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
    let foundCount = 0;
    let savedCount = 0;

    // Use newest-first (default) to ensure we get the latest 3000 messages
    for await (const message of client.iterMessages(target.inputEntity, { limit: 3000 })) {
        if (message.date < ninetyDaysAgo) {
            break; // Stop if we go past 90 days
        }

        const text = message.text || message.message || "";
        const betData = parseBetMessage(text);

        if (betData) {
            foundCount++;
            // Check for duplicates
            const snapshot = await db.collection('bets')
                .where('match', '==', betData.match)
                .where('selection', '==', betData.selection)
                .get();
            if (snapshot.empty) {
                const originalDate = new Date(message.date * 1000);
                const isoDate = originalDate.toISOString();
                const formatted = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(originalDate);

                // OCR for odds
                if (message.media) {
                    try {
                        const buffer = await client.downloadMedia(message.media);
                        const tempPath = path.join(__dirname, `temp_hist_${message.id}.jpg`);
                        const processedPath = path.join(__dirname, `proc_hist_${message.id}.png`);

                        // Pre-process with sharp: grayscale, resize, and increase contrast
                        await sharp(buffer)
                            .resize({ width: 2000 }) // Upscale for better OCR
                            .grayscale()
                            .normalize()
                            .sharpen()
                            .toFile(processedPath);

                        const { data: { text } } = await Tesseract.recognize(processedPath, 'eng', {
                            tessedit_pageseg_mode: '11' // Sparse text
                        });

                        console.log(`--- OCR TEXT START (ID: ${message.id}) ---`);
                        console.log(text);
                        console.log(`--- OCR TEXT END ---`);

                        const oddsRegex = /\b(\d[.,]\d{1,2})\b/g;
                        const matches = text.match(oddsRegex);
                        if (matches) {
                            for (const m of matches) {
                                const val = parseFloat(m.replace(',', '.'));
                                if (val >= 1.10 && val <= 5.0) {
                                    betData.odds = val;
                                    break;
                                }
                            }
                        }

                        if (fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
                    } catch (ocrErr) {
                        console.error("OCR History Error:", ocrErr);
                    }
                }

                console.log(`📥 [HISTORY] New bet found: ${betData.match} (${formatted}) | Odds: ${betData.odds}`);
                await db.collection('bets').add({
                    ...betData,
                    timestamp: isoDate,
                    formattedDate: formatted,
                    source: 'YRL_BETS_HISTORY'
                });
                savedCount++;
            }
        }
    }

    console.log(`\n✅ Historic Scan Complete!`);
    console.log(`📊 Found: ${foundCount} bets`);
    console.log(`💾 Saved: ${savedCount} new bets`);

    await client.disconnect();
    process.exit(0);
};

runScan().catch(err => {
    console.error("Fatal Error during scan:", err);
    process.exit(1);
});

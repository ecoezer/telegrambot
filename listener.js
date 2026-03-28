import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import admin from 'firebase-admin';
import dotenv from "dotenv";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { parseBetMessage } from "./src/utils/parser.js";
import { performOCR, initOCR } from "./src/utils/ocr.js";
import { checkAndResolveResults } from "./src/utils/resultChecker.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// 0. Dummy HTTP Server for Render "Web Service" (Free Tier requirement)
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Userbot is running!");
}).listen(PORT, () => {
    console.log(`🌍 Dummy HTTP server listening on port ${PORT}`);
});

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
    useWSS: true, // Secure connection
});



// 4. Historic Scan Function (Optimized)
const scanHistory = async () => {
    console.log("📜 Starting Historic Scan (Last 210 Days)...");

    // Pre-fetch all existing bets to avoid N+1 reads
    console.log("📥 Fetching existing bets from DB...");
    const existingBetsSnapshot = await db.collection('bets').get();
    const existingBetsMap = new Map(); // Key -> { id, stake }

    existingBetsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.match && data.selection) {
            const key = `${data.match}_${data.selection}`;
            existingBetsMap.set(key, { id: doc.id, stake: data.stake || 1 });
        }
    });
    console.log(`✅ Loaded ${existingBetsMap.size} existing bets.`);

    // Find the channel
    const dialogs = await client.getDialogs();
    console.log(`🔎 Found ${dialogs.length} chats. Searching for 'YRL BETS'...`);

    // Optimized Search Logic
    let target = dialogs.find(d => d.id.toString() === "-1001359611294") ||
        dialogs.find(d => d.title === "⚡️ YRL BETS") ||
        dialogs.find(d => d.title && d.title.includes("YRL BETS") && !d.title.includes("Chat")) ||
        dialogs.find(d => d.title && d.title.includes("YRL BETS"));

    if (!target) {
        console.log("⚠️  Could not find 'YRL BETS' automatically.");
        return;
    }

    console.log(`🔎 Found channel: ${target.title} (${target.id}). Scanning...`);

    // Standard scan window: 30 days
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const newBets = [];
    const updatedBets = []; // For stake updates
    const MAX_BATCH_SIZE = 500; // Firestore limit per batch

    // Iterate messages
    let processedCount = 0;
    // Optimized limit for daily operation
    const FETCH_LIMIT = 1000;
    console.log(`📥 Fetching last ${FETCH_LIMIT} messages...`);

    for (const message of await client.getMessages(target.inputEntity, { limit: FETCH_LIMIT })) {
        if (message.date < sevenDaysAgo) {
            console.log("⏹️  Reached 14-day limit. Stopping scan.");
            break;
        }

        const text = message.text || message.message || "";

        let betData = parseBetMessage(text, message.date); // Pass timestamp

        // Fallback: Try OCR if text parsing fails and media exists
        // STRICT POLICY: Only process the images from the text '❗️Daily BET from YRL BETS ❗️'
        // All other images text messages or stuffed with text "YRL VIP Classic" images will be on your ignore list.
        const isStrictDailyBet = text.includes("Daily BET from YRL BETS");
        const isVipSpam = text.includes("VIP Classic");

        // Skip if it's VIP spam
        if (isVipSpam) continue;

        // ENHANCEMENT: If we found a text bet (via parser), but it lacks ODDS OR STAKE is default (1), try OCR to fill in the gaps.
        // Parser already checks for "Daily BET from YRL BETS", so betData implies strict compliance.
        // We want to trigger this if odds are missing OR if stake is just 1 (which might be a placeholder).
        if (betData && message.media && ((!betData.odds || betData.odds === 0) || betData.stake === 1)) {
            console.log(`📷 Text bet found with missing Odds or Default Stake. Attempting OCR enhancement for: ${betData.match}`);
            try {
                const ocrResult = await performOCR(client, message);
                // If OCR found odds OR a better stake, update betData
                if (ocrResult && (ocrResult.odds > 0 || ocrResult.stake > 1)) {
                    console.log(`✅ Enhanced Text Bet with OCR - Odds: ${ocrResult.odds}, Stake: ${ocrResult.stake}`);
                    if (ocrResult.odds > 0) betData.odds = ocrResult.odds;
                    if (ocrResult.stake > 1) betData.stake = ocrResult.stake;

                    // Optional: Overwrite date if OCR found a specific one? 
                    // Let's stick to text-derived date (message date) to be safe unless OCR date is strictly better.
                    if (ocrResult.timestamp && ocrResult.formattedDate) {
                        betData.timestamp = ocrResult.timestamp;
                        betData.formattedDate = ocrResult.formattedDate;
                    }
                }
            } catch (e) {
                console.log("⚠️ OCR Enhancement failed:", e.message);
            }
        }

        // Fallback: If text parser returned null (e.g. slight format mismatch), but header is STRICTLY present
        if (!betData && message.media && isStrictDailyBet) {
            console.log("📷 Strict 'Daily BET' header found but text parse failed. Attempting OCR...");
            const ocrResult = await performOCR(client, message);

            // If OCR returns a full bet object (indicated by source: 'OCR')
            if (ocrResult && ocrResult.source === 'OCR') {
                betData = ocrResult;
                console.log("✨ Created Bet from Image:", betData.match);
            }
        }

        if (betData) {
            const uniqueKey = `${betData.match}_${betData.selection}`;

            if (!existingBetsMap.has(uniqueKey)) {
                betData.source = 'YRL_BETS_HISTORY';
                newBets.push(betData);
                existingBetsMap.set(uniqueKey, { id: 'PENDING', stake: betData.stake }); // Prevent duplicates in this run
                console.log(`🆕 Queued New Bet: ${betData.match} (${betData.formattedDate})`);
            } else {
                // Check if we need to update the stake or ODDS
                const existing = existingBetsMap.get(uniqueKey);
                const updates = {};
                let needsUpdate = false;

                // Update Stake if > 1 and existing is 1
                if (existing.id !== 'PENDING' && existing.stake === 1 && betData.stake > 1) {
                    updates.stake = betData.stake;
                    existing.stake = betData.stake;
                    needsUpdate = true;
                    console.log(`🔄 Queued Stake Update: ${betData.match} (1 -> ${betData.stake})`);
                }

                // Update Odds if existing is 0 or missing, and we found valid odds
                // Also update if we found better odds (e.g. from OCR)
                if (existing.id !== 'PENDING' && (!existing.odds || existing.odds === 0) && betData.odds > 0) {
                    updates.odds = betData.odds;
                    existing.odds = betData.odds;
                    needsUpdate = true;
                    console.log(`🔄 Queued Odds Update: ${betData.match} (0 -> ${betData.odds})`);
                }

                if (needsUpdate) {
                    updatedBets.push({ id: existing.id, ...updates });
                }
            }
        }

        // Incremental Batch Save (Safety against crashes)
        if (newBets.length >= 50) {
            await saveNewBets(newBets.splice(0, newBets.length));
        }
        if (updatedBets.length >= 50) {
            await updateExistingBets(updatedBets.splice(0, updatedBets.length));
        }

        processedCount++;
        if (processedCount % 100 === 0) process.stdout.write(".");
    }
    console.log("\n");

    // Save remaining
    await saveNewBets(newBets);
    await updateExistingBets(updatedBets);

    console.log("✅ Historic Scan Complete.");
};

// Helper Macros (with Firestore 500 batch limit protection)
const FIRESTORE_BATCH_LIMIT = 500;

const saveNewBets = async (bets) => {
    if (bets.length === 0) return;
    console.log(`💾 Saving ${bets.length} new bets...`);
    for (let i = 0; i < bets.length; i += FIRESTORE_BATCH_LIMIT) {
        const chunk = bets.slice(i, i + FIRESTORE_BATCH_LIMIT);
        const batch = db.batch();
        chunk.forEach(bet => {
            const ref = db.collection('bets').doc();
            batch.set(ref, bet);
        });
        await batch.commit();
    }
};

const updateExistingBets = async (updates) => {
    if (updates.length === 0) return;
    console.log(`💾 Updating ${updates.length} bets...`);
    for (let i = 0; i < updates.length; i += FIRESTORE_BATCH_LIMIT) {
        const chunk = updates.slice(i, i + FIRESTORE_BATCH_LIMIT);
        const batch = db.batch();
        chunk.forEach(u => {
            const ref = db.collection('bets').doc(u.id);
            const { id, ...data } = u;
            batch.update(ref, data);
        });
        await batch.commit();
    }
};

(async () => {
    console.log("🚀 Starting Userbot Listener...");
    await client.connect();
    console.log("✅ Connected to Telegram!");

    // Init OCR Worker
    await initOCR();

    // Step 1: Scan history and save new bets
    await scanHistory();

    // Step 2: Check results for pending bets and update statuses
    await checkAndResolveResults(db);

    // 4. Add Event Handler
    client.addEventHandler(async (event) => {
        try {
            const message = event.message;
            const text = message.text || message.message || "";

            // OPTIMIZATION: Check text content FIRST to avoid expensive getChat() calls
            // This prevents API rate limits if the bot is in busy groups
            const isRelevantText = text.includes("YRL BETS");
            const isSavedMessages = !message.chatId; // Rough heuristic, or we can just skip title check if text matches

            if (!isRelevantText && !message.message?.peerId?.channelId) {
                // If text doesn't match and it's not a channel we might be interested in...
                // But we need to know the channel title to be sure. 
                // Let's settle for: Only call getChat if text looks promising OR if we are debugging.
                return;
            }

            // Log incoming messages for debugging (only relevant ones)
            const chat = await message.getChat();
            const title = chat.title || chat.username || chat.id || "Unknown";

            // Double check title just in case the text check missed something but the *channel* is right
            if (title.includes("YRL BETS") || text.includes("YRL BETS") || title === "Saved Messages") {
                console.log(`📩 New Message from ${title}: ${text.substring(0, 50)}...`);
            } else {
                return; // Skip processing
            }

            let betData = parseBetMessage(text);

            // STRICT POLICY: Only process the images from the text '❗️Daily BET from YRL BETS ❗️'
            // All other images text messages or stuffed with text "YRL VIP Classic" images will be on your ignore list.
            const isStrictDailyBet = text.includes("Daily BET from YRL BETS");
            const isVipSpam = text.includes("VIP Classic");

            // Skip if it's VIP spam
            if (isVipSpam) return;

            if (!betData && message.media && isStrictDailyBet) {
                console.log("📷 Strict 'Daily BET' header found but text parse failed. Attempting OCR...");
                const ocrResult = await performOCR(client, message);

                // If OCR returns a full bet object (indicated by source: 'OCR')
                if (ocrResult && ocrResult.source === 'OCR') {
                    betData = ocrResult;
                    console.log("✨ Created Bet from Image:", betData.match);
                }
            }

            if (betData) {
                console.log("🎯 FOUND YRL FREE BET!", betData.match);

                // Duplicate check before saving
                const existingCheck = await db.collection('bets')
                    .where('match', '==', betData.match)
                    .where('selection', '==', betData.selection)
                    .limit(1).get();
                if (!existingCheck.empty) {
                    console.log(`⏭️ Duplicate bet skipped: ${betData.match}`);
                    return;
                }

                // ENHANCEMENT: If we have a text-based bet but missing odds, check image for odds
                if (message.media && (!betData.odds || betData.odds === 0)) {
                    const ocrResult = await performOCR(client, message);
                    if (ocrResult && ocrResult.odds) {
                        betData.odds = ocrResult.odds;
                        console.log("✅ Enhanced Text Bet with OCR Odds:", betData.odds);
                    }
                }

                await db.collection('bets').add(betData);
                console.log("💾 Saved to Firestore.");

                // Optional: Send a confirmation to Saved Messages so you know it worked
                await client.sendMessage("me", { message: `✅ Saved Bet: ${betData.match}` });
            }
        } catch (e) {
            console.error("Error processing message:", e);
        }
    }, new NewMessage({}));

    // Periodic result checking every 30 minutes
    setInterval(async () => {
        console.log('\n⏰ Periodic result check triggered...');
        try {
            await checkAndResolveResults(db);
        } catch (e) {
            console.error('❌ Periodic check failed:', e.message);
        }
    }, 30 * 60 * 1000);

    console.log("🎧 Listening for bets... (result check every 30 min)");
})();

// Graceful shutdown
const shutdown = async (signal) => {
    console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
    try {
        const { terminateOCR: terminate } = await import('./src/utils/ocr.js');
        await terminate();
    } catch (e) { /* ignore */ }
    try {
        await client.disconnect();
    } catch (e) { /* ignore */ }
    process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

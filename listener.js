import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import admin from 'firebase-admin';
import dotenv from "dotenv";
import http from "http";
import fs from "fs";
import path from "path";
import Tesseract from "tesseract.js";
import { fileURLToPath } from 'url';

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

// 3. Parser Logic (Same as before)
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

    // Attempt to extract odds (e.g. "@ 1.90", "1.90", "2.0")
    // Looking for a decimal number at the end or after @
    const oddsMatch = selectionRaw.match(/@\s*(\d+\.\d+)/) || selectionRaw.match(/(\d+\.\d+)$/);
    const parsedOdds = oddsMatch ? parseFloat(oddsMatch[1]) : 0;

    // Clean selection text (remove the odds part if found)
    const selection = parsedOdds > 0 ? selectionRaw.replace(oddsMatch[0], '').trim() : selectionRaw;

    return {
        sport: sportMatch ? sportMatch[1].trim() : "Unknown",
        match: matchMatch[1].trim(),
        selection: selection, // Cleaned selection
        raw: text,
        timestamp: new Date().toISOString(),
        formattedDate: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
        status: 'pending',
        odds: parsedOdds,
        stake: 1 // Default unit
    };
};

// 4. Historic Scan Function
const scanHistory = async () => {
    console.log("📜 Starting Historic Scan (Last 7 Days)...");

    // Find the channel
    const dialogs = await client.getDialogs();

    // Debug: Print all dialog titles to see what the bot sees
    console.log("------------------------------------------------");
    console.log(`🔎 Found ${dialogs.length} chats. Searching for 'YRL BETS'...`);
    dialogs.forEach(d => {
        if (d.title && d.title.toLowerCase().includes("bet")) {
            console.log(`   - Found Potential Match: "${d.title}" (ID: ${d.id})`);
        }
    });
    console.log("------------------------------------------------");

    // Looser search (includes) + checking ID if known
    // Priority: Exact ID (-1001359611294) -> Exact Name "⚡️ YRL BETS" -> Name includes "YRL BETS"
    let target = dialogs.find(d => d.id.toString() === "-1001359611294");

    if (!target) {
        target = dialogs.find(d => d.title === "⚡️ YRL BETS");
    }

    if (!target) {
        // Fallback: Find one that has "YRL BETS" but NOT "Chat"
        target = dialogs.find(d => d.title && d.title.includes("YRL BETS") && !d.title.includes("Chat"));
    }

    if (!target) {
        // Final Fallback
        target = dialogs.find(d => d.title && d.title.includes("YRL BETS"));
    }

    if (!target) {
        console.log("⚠️  Could not find 'YRL BETS' automatically.");
        console.log("👉 Please check the list above and update the script with the exact Name or ID.");
        return;
    }

    console.log(`🔎 Found channel: ${target.title} (${target.id}). Scanning...`);

    const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

    // Iterate messages
    for await (const message of client.iterMessages(target.inputEntity, { limit: 500 })) {
        if (message.date < sevenDaysAgo) {
            console.log("⏹️  Reached 7-day limit. Stopping scan.");
            break;
        }

        const text = message.text || message.message || "";
        const betData = parseBetMessage(text);

        if (betData) {
            // Check for duplicates (simple check by match name for now)
            const snapshot = await db.collection('bets')
                .where('match', '==', betData.match)
                .where('selection', '==', betData.selection)
                .get();

            if (snapshot.empty) {
                console.log(`📥 [HISTORY] New bet found: ${betData.match} (${formatted})`);
                await db.collection('bets').add({
                    ...betData,
                    timestamp: isoDate,
                    formattedDate: formatted,
                    source: 'YRL_BETS_HISTORY'
                });
            } else {
                // console.log(`Duplicate found, skipping: ${betData.match}`);
            }
        }
    }
    console.log("✅ Historic Scan Complete.");
};

(async () => {
    console.log("🚀 Starting Userbot Listener...");
    await client.connect();
    console.log("✅ Connected to Telegram!");

    // Run scan on startup
    await scanHistory();

    // 4. Add Event Handler
    client.addEventHandler(async (event) => {
        try {
            const message = event.message;
            const text = message.text || message.message || "";

            // Log incoming messages for debugging
            const chat = await message.getChat();
            const title = chat.title || chat.username || chat.id || "Unknown";

            // Only log if it comes from YRL BETS or contains the user's explicit testing signature
            if (title.includes("YRL BETS") || text.includes("YRL BETS") || title === "Saved Messages") {
                console.log(`📩 New Message from ${title}: ${text.substring(0, 50)}...`);
            }

            const betData = parseBetMessage(text);

            if (betData) {
                console.log("🎯 FOUND YRL FREE BET!", betData.match);

                // Check for media to extract odds via OCR
                if (message.media) {
                    try {
                        console.log("📸 Downloading media for OCR...");
                        const buffer = await client.downloadMedia(message.media);
                        const tempPath = path.join(__dirname, `temp_bet_${message.id}.jpg`);
                        fs.writeFileSync(tempPath, buffer);

                        console.log("🔍 Running OCR...");
                        const { data: { text } } = await Tesseract.recognize(tempPath, 'eng');

                        // Look for odds format (e.g. 1.77, 2.05)
                        const oddsRegex = /\b(\d[.,]\d{1,2})\b/g;
                        const matches = text.match(oddsRegex);
                        if (matches && matches.length > 0) {
                            // Usually the highest or the first one in the main area. 
                            // In the image provided, 1.77 appears in the badge.
                            betData.odds = parseFloat(matches[0]);
                            console.log(`✅ Extracted Odds via OCR: ${betData.odds}`);
                        }

                        fs.unlinkSync(tempPath); // Cleanup
                    } catch (ocrError) {
                        console.error("❌ OCR Error:", ocrError);
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
    }, new NewMessage({})); // Listen to ALL messages (simpler) or filter by channel

    // Keep process alive
    console.log("🎧 Listening for bets...");
})();

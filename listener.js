import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import admin from 'firebase-admin';
import dotenv from "dotenv";
import http from "http";

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
    if (!text.includes("Daily BET from YRL BETS")) return null;

    const sportRegex = /🏀\s*(.+)/;
    const matchRegex = /🔹\s*(.+)/;
    const betRegex = /🔸\s*Bet:\s*(.+)((?:\n|$))/;

    const sportMatch = text.match(sportRegex);
    const matchMatch = text.match(matchRegex);
    const betMatch = text.match(betRegex);

    if (!matchMatch || !betMatch) return null;

    return {
        sport: sportMatch ? sportMatch[1].trim() : "Unknown",
        match: matchMatch[1].trim(),
        selection: betMatch[1].trim(),
        raw: text,
        timestamp: new Date().toISOString(),
        status: 'pending',
        odds: 0,
        stake: 0
    };
};

(async () => {
    console.log("🚀 Starting Userbot Listener...");
    await client.connect();
    console.log("✅ Connected to Telegram!");

    // 4. Add Event Handler
    client.addEventHandler(async (event) => {
        try {
            const message = event.message;
            const text = message.text || message.message || "";

            // Log incoming messages for debugging (optional, careful with privacy)
            // console.log("New Message:", text.substring(0, 50) + "...");

            const betData = parseBetMessage(text);

            if (betData) {
                console.log("🎯 FOUND FREE BET!", betData.match);

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

import { Telegraf } from 'telegraf';
import admin from 'firebase-admin';

// Initialize Firebase Admin (Singleton pattern)
if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        });
    } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT missing. DB writes might fail.");
    }
}

const db = admin.apps.length ? admin.firestore() : null;
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Parser Logic
const parseBetMessage = (text) => {
    // Check Trigger
    if (!text.includes("Daily BET from YRL BETS")) return null;

    const sportRegex = /🏀\s*(.+)/;
    const matchRegex = /🔹\s*(.+)/;
    const betRegex = /🔸\s*Bet:\s*(.+)((?:\n|$))/; // Capture until newline or end

    // Extract
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
        status: 'pending', // pending, won, lost
        odds: 0, // Placeholder, not in text
        stake: 0 // Placeholder
    };
};

bot.on('message', async (ctx) => {
    try {
        const text = ctx.message.text || ctx.message.caption || "";
        console.log("Received message:", text);

        const betData = parseBetMessage(text);

        if (betData) {
            console.log("Parsed Bet:", betData);

            if (db) {
                await db.collection('bets').add(betData);
                await ctx.reply(`✅ Bet recorded: ${betData.match} - ${betData.selection}`);
            } else {
                await ctx.reply(`⚠️ Parsed, but DB configured.`);
            }
        } else {
            console.log("Message did not match bet format.");
        }
    } catch (e) {
        console.error("Error processing message:", e);
    }
});

// Netlify Handler
export const handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 200, body: "Method Not Allowed" };
    }

    try {
        const body = JSON.parse(event.body);
        await bot.handleUpdate(body);
        return { statusCode: 200, body: "OK" };
    } catch (e) {
        console.error("Handler error:", e);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};


import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import dotenv from "dotenv";
import { parseBetMessage } from "./src/utils/parser.js";

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession(process.env.TELEGRAM_SESSION);

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
    useWSS: true,
});

(async () => {
    console.log("🚀 Connecting to Telegram...");
    await client.connect();
    console.log("✅ Connected!");

    const dialogs = await client.getDialogs();
    let target = dialogs.find(d => d.id.toString() === "-1001359611294") ||
        dialogs.find(d => d.title === "⚡️ YRL BETS") ||
        dialogs.find(d => d.title && d.title.includes("YRL BETS") && !d.title.includes("Chat"));

    if (!target) {
        console.error("❌ Could not find channel!");
        process.exit(1);
    }

    console.log(`🔎 Scanning ${target.title} (${target.id}) for messages since Feb 7, 2026...`);

    // Feb 7, 2026 timestamp
    const sinceDate = Math.floor(new Date('2026-02-07T00:00:00Z').getTime() / 1000);

    const messages = await client.getMessages(target.inputEntity, { limit: 100 });

    console.log(`📥 Fetched ${messages.length} recent messages.`);

    let count = 0;
    for (const message of messages) {
        if (message.date < sinceDate) break;

        const text = message.text || "";

        // Check for BETs OR RESULTs
        const isBet = text.includes("Daily BET");
        const isResult = text.includes("Final Score") || text.includes("Result -");

        if (!isBet && !isResult) continue;

        console.log("\n---------------------------------------------------");
        console.log(`📅 Date: ${new Date(message.date * 1000).toISOString()}`);
        console.log(`📝 Text:\n${text}`);

        if (message.replyTo) {
            console.log(`↩️  Replying to msg ID: ${message.replyTo.replyToMsgId}`);
            try {
                const parentMsg = await client.getMessages(target.inputEntity, { ids: message.replyTo.replyToMsgId });
                if (parentMsg && parentMsg.length > 0) {
                    const parentText = parentMsg[0].text || "";
                    console.log(`   👉 Parent Text: ${parentText.substring(0, 50)}...`);
                }
            } catch (e) {
                console.log(`   ⚠️ Could not fetch parent: ${e.message}`);
            }
        } else {
            console.log(`⚠️  No Reply ID found.`);
        }

        if (isBet) {
            try {
                const parsed = parseBetMessage(text, message.date);
                if (parsed) {
                    console.log("✅ PARSED BET:", parsed.match);
                }
            } catch (e) {
                console.log("❌ PARSER EXCEPTION:", e.message);
            }
        }

        count++;
    }

    if (count === 0) {
        console.log("⚠️ No messages found in the specified date range.");
    }

    process.exit(0);
})();

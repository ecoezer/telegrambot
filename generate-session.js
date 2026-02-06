import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import input from "input";
import dotenv from "dotenv";

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession("");

(async () => {
    console.log("Loading interactive login...");
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
        useWSS: true,
    });

    await client.start({
        phoneNumber: async () => await input.text("Please enter your number (international format, e.g., +905551234567): "),
        password: async () => await input.text("Please enter your password (if enabled): "),
        phoneCode: async () => await input.text("Please enter the code you received: "),
        onError: (err) => console.log(err),
    });

    console.log("\n✅ Login Successful!");
    console.log("⚠️  SAVE THIS SESSION STRING (Keep it secret!) ⚠️\n");
    console.log(client.session.save());
    console.log("\n============================================\n");

    // Clean exit
    process.exit(0);
})();

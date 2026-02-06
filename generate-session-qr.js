import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import qrcode from "qrcode-terminal";
import dotenv from "dotenv";

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession("");

(async () => {
    console.log("Loading QR Code login (Direct Method)...");

    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
        useWSS: true,
    });

    await client.connect();

    try {
        const user = await client.signInUserWithQrCode({
            apiId,
            apiHash,
        }, {
            qrCode: async (code) => {
                console.log("\nScan this QR code with your Telegram App:");
                console.log("Settings -> Devices -> Link Desktop Device\n");

                const loginUrl = `tg://login?token=${code.token.toString('base64')}`;

                console.log("================ QR CODE START ================");
                qrcode.generate(loginUrl, { small: true });
                console.log("================= QR CODE END =================\n");

                console.log("OR Use this Raw Token if the QR doesn't show:");
                console.log(`${loginUrl}\n`);
            },
            onError: (err) => console.log("QR Error:", err),
        });

        console.log("\n✅ Login Successful!");
        console.log("⚠️  SAVE THIS SESSION STRING (Keep it secret!) ⚠️\n");
        console.log(client.session.save());
        console.log("\n============================================\n");

        // Keep process alive briefly to ensure flush
        setTimeout(() => process.exit(0), 1000);

    } catch (e) {
        console.error("Login Failed:", e);
        process.exit(1);
    }
})();

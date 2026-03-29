import fs from 'fs';
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import dotenv from "dotenv";
import { performOCR, initOCR } from "./src/utils/ocr.js";

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession(process.env.TELEGRAM_SESSION || "");

const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 1 });

async function run() {
  await client.connect();
  await initOCR();
  const target = "-1001359611294"; 
  
  // get last 50 messages
  const messages = await client.getMessages(target, { limit: 50 });
  
  for (const msg of messages) {
    const text = msg.text || msg.message || "";
    if (text.includes("Sabalenka") || text.includes("Barcelona VS Crvena")) {
      console.log(`\n\n--- Testing Message ID: ${msg.id} ---`);
      console.log(`Text: ${text}`);
      if (msg.media) {
         await performOCR(client, msg);
         // Find the temp file and just dump the parsed OCR
         
      }
    }
  }
  process.exit(0);
}
run();

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
  
  const msg = await client.getMessages(target, { ids: 24150 });
  if (msg[0] && msg[0].media) {
    console.log(`\n\n--- Testing Message ID: 24150 (Lehecka) ---`);
    await performOCR(client, msg[0]);
  }
  process.exit(0);
}
run();

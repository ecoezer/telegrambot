// Run this locally with `node set-webhook.js <YOUR_NETLIFY_URL>`
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.argv[2];

if (!token || !url) {
    console.error("Usage: node set-webhook.js <YOUR_NETLIFY_URL>");
    console.error("Make sure TELEGRAM_BOT_TOKEN is in .env");
    process.exit(1);
}

// Ensure no trailing slash
const cleanUrl = url.replace(/\/$/, "");
const webhookUrl = `${cleanUrl}/.netlify/functions/telegram-hook`;

console.log(`Setting webhook to: ${webhookUrl}`);

axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
    url: webhookUrl
})
    .then(res => {
        console.log("Success:", res.data);
    })
    .catch(err => {
        console.error("Error:", err.response ? err.response.data : err.message);
    });

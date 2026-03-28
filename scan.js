/**
 * scan.js - GitHub Actions One-Shot Scanner
 * 
 * Bu script, GitHub Actions tarafından her 15 dakikada bir çalıştırılır.
 * - Telegram kanalındaki yeni bahisleri tarar
 * - Firebase'e kaydeder
 * - Bekleyen bahislerin sonuçlarını kontrol eder
 * - Çıkar (persistent bağlantı gerekmez)
 */

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import admin from 'firebase-admin';
import dotenv from "dotenv";
import { parseBetMessage } from "./src/utils/parser.js";
import { checkAndResolveResults } from "./src/utils/resultChecker.js";

dotenv.config();

// ── Firebase Başlatma ──
if (!admin.apps.length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error("❌ FIREBASE_SERVICE_ACCOUNT eksik!");
        process.exit(1);
    }
    // Tek tırnak veya çift tırnak ile sarılmış olabilir (.env kopyalamasından)
    const rawSA = process.env.FIREBASE_SERVICE_ACCOUNT.trim().replace(/^[\u2018\u2019'""]|[\u2018\u2019'""]$/g, '');
    let serviceAccount;
    try {
        serviceAccount = JSON.parse(rawSA);
    } catch (e) {
        console.error("❌ FIREBASE_SERVICE_ACCOUNT geçerli JSON değil!");
        console.error("İlk 50 karakter:", rawSA.slice(0, 50));
        process.exit(1);
    }
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// ── Telegram Başlatma ──
const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession(process.env.TELEGRAM_SESSION || "");

if (!apiId || !apiHash || !process.env.TELEGRAM_SESSION) {
    console.error("❌ Telegram env değişkenleri eksik!");
    process.exit(1);
}

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
    useWSS: true,
});

// ── Sabitler ──
const CHANNEL_ID = "-1001359611294";
const FIRESTORE_BATCH_LIMIT = 500;
const FETCH_LIMIT = 300; // 15 dakikada max 300 mesaj yeterli

// ── Yardımcı: Yeni bahisleri kaydet ──
async function saveNewBets(bets) {
    if (bets.length === 0) return;
    console.log(`💾 ${bets.length} yeni bahis kaydediliyor...`);
    for (let i = 0; i < bets.length; i += FIRESTORE_BATCH_LIMIT) {
        const chunk = bets.slice(i, i + FIRESTORE_BATCH_LIMIT);
        const batch = db.batch();
        chunk.forEach(bet => {
            const ref = db.collection('bets').doc();
            batch.set(ref, bet);
        });
        await batch.commit();
    }
    console.log(`✅ ${bets.length} bahis kaydedildi.`);
}

// ── Ana Fonksiyon ──
async function main() {
    const startTime = Date.now();
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🚀 YRL Bets Scanner - ${new Date().toISOString()}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Telegram bağlantısı
    await client.connect();
    console.log("✅ Telegram bağlantısı kuruldu.");

    // Son taranan mesaj ID'sini Firestore'dan al
    const metaRef = db.collection('_meta').doc('scanner');
    const metaDoc = await metaRef.get();
    const lastMessageId = metaDoc.exists ? (metaDoc.data().lastMessageId || 0) : 0;
    console.log(`📌 Son taranan mesaj ID: ${lastMessageId}`);

    // Kanalı bul
    const dialogs = await client.getDialogs();
    const target =
        dialogs.find(d => d.id?.toString() === CHANNEL_ID) ||
        dialogs.find(d => d.title === "⚡️ YRL BETS") ||
        dialogs.find(d => d.title?.includes("YRL BETS") && !d.title?.includes("Chat")) ||
        dialogs.find(d => d.title?.includes("YRL BETS"));

    if (!target) {
        console.error("⚠️ 'YRL BETS' kanalı bulunamadı!");
        return;
    }
    console.log(`📡 Kanal bulundu: ${target.title}`);

    // Mesajları çek
    const messages = await client.getMessages(target.inputEntity, { limit: FETCH_LIMIT });
    console.log(`📥 ${messages.length} mesaj alındı, yeni olanlar filtreleniyor...`);

    // Mevcut bahisleri önceden çek (duplicate koruması)
    const existingBetsSnapshot = await db.collection('bets').get();
    const existingBetsMap = new Map();
    existingBetsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.match && data.selection) {
            existingBetsMap.set(`${data.match}_${data.selection}`, true);
        }
    });
    console.log(`🗂️  Mevcut ${existingBetsMap.size} bahis yüklendi.`);

    const newBets = [];
    let maxMessageId = lastMessageId;
    let processedCount = 0;

    for (const message of messages) {
        // Sadece son taramamızdan sonraki mesajları işle
        if (message.id <= lastMessageId) continue;
        if (message.id > maxMessageId) maxMessageId = message.id;

        processedCount++;
        const text = message.text || message.message || "";

        // VIP spam'i atla
        if (text.includes("VIP Classic")) continue;

        // Text parser ile bahis çıkar
        const betData = parseBetMessage(text, message.date);

        if (betData) {
            const key = `${betData.match}_${betData.selection}`;
            if (!existingBetsMap.has(key)) {
                betData.source = 'YRL_BETS_ACTIONS';
                newBets.push(betData);
                existingBetsMap.set(key, true);
                console.log(`🆕 Yeni bahis tespit edildi: ${betData.match} @ ${betData.odds}`);
            } else {
                console.log(`⏭️  Tekrar bahis atlandı: ${betData.match}`);
            }
        }
    }

    console.log(`\n📊 ${processedCount} yeni mesaj işlendi.`);

    // Yeni bahisleri kaydet
    await saveNewBets(newBets);

    // Son taranan mesaj ID'sini güncelle
    if (maxMessageId > lastMessageId) {
        await metaRef.set({
            lastMessageId: maxMessageId,
            lastScan: new Date().toISOString(),
            newBetsFound: newBets.length
        });
        console.log(`📌 Scanner durumu güncellendi (lastMessageId: ${maxMessageId})`);
    }

    // Bekleyen bahislerin sonuçlarını kontrol et
    console.log("\n🔍 Bekleyen bahislerin sonuçları kontrol ediliyor...");
    await checkAndResolveResults(db);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Tarama tamamlandı! Süre: ${elapsed}s | Yeni Bahis: ${newBets.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// ── Çalıştır ──
main()
    .catch(err => {
        console.error("❌ Tarama hatası:", err);
        process.exit(1);
    })
    .finally(async () => {
        try { await client.disconnect(); } catch (_) { }
        // Firebase bağlantısını kapat
        setTimeout(() => process.exit(0), 3000);
    });

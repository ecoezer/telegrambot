# 🎯 YRL BETS - Tam Sistem Analizi

> Hazırlanma Tarihi: 2026-03-28  
> Analiz Eden: Antigravity AI  
> Proje Dizini: `/Users/emrahcahitoezer/telegrambot`

---

## 📐 Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                     YRL BETS SİSTEMİ                        │
├─────────────────┬───────────────────┬───────────────────────┤
│  BACKEND        │    VERİTABANI     │     FRONTEND          │
│  (listener.js)  │   (Firebase)      │   (React Dashboard)   │
│                 │                   │                       │
│  • Telegram     │  • Firestore      │  • Dashboard.jsx      │
│    Userbot      │    'bets' coll.   │  • BetCard.jsx        │
│  • OCR Engine   │                   │  • MartingaleSimulator│
│  • ResultChecker│                   │  • Chat.jsx           │
│  • HTTP Server  │                   │  • Stats.jsx          │
└─────────────────┴───────────────────┴───────────────────────┘
```

---

## 🔄 Sistemin Çalışma Akışı

### Adım 1: Başlangıç (listener.js)
1. Dummy HTTP server portu dinlemeye başlar (eski Render.com gereksinimi)
2. Firebase Admin SDK başlatılır (`FIREBASE_SERVICE_ACCOUNT` env değişkeninden)
3. Telegram MTProto client bağlantısı kurulur (`TELEGRAM_SESSION` string'i ile)
4. Tesseract.js OCR worker başlatılır (İngilizce dil paketiyle)

### Adım 2: Tarihsel Tarama (`scanHistory`)
- Son **30 günün** mesajları taranır (son 1000 mesaj limitiyle)
- "YRL BETS" kanalı ID (-1001359611294) veya isimle bulunur
- "VIP Classic" mesajları **otomatik atlanır**
- Her mesaj için şu sırayla işlem yapılır:
  1. **Text Parser** → `parseBetMessage()` çalıştırılır
  2. Eğer text başarısız + resim varsa → **OCR** devreye girer (3 pass)
  3. Duplicate kontrol → Firestore'da aynı `match_selection` key'i var mı?
  4. Yeni bahis → Firestore'a batch olarak kaydedilir

### Adım 3: Sonuç Kontrolü (`checkAndResolveResults`)
- Firestore'daki tüm `pending` bahisler çekilir
- Her pendingbet için **5 farklı API** sırayla sorgulanır:
  1. **TheSportsDB** (ücretsiz, birincil)
  2. **ESPN** (ücretsiz, resmi olmayan API)
  3. **TheSportsDB by Team** (yedek)
  4. **Web Search** (Brave + DuckDuckGo fallback)
  5. **SofaScore API** (son çare)
- Skor bulunursa bahis durumu `win`/`loss` olarak güncellenir

### Adım 4: Gerçek Zamanlı Dinleme
- Telegram'dan gelen HER mesaj yakalanır (`NewMessage` event handler)
- Sadece "YRL BETS" kanalından gelenler işlenir
- Yeni bahis tespit edilirse → Firestore'a anında kaydedilir
- Kayıt sonrası "Saved Messages"a onay mesajı gönderilir

### Adım 5: Periyodik Sonuç Kontrolü
- Her **30 dakikada bir** `checkAndResolveResults` otomatik çalışır
- Bekleyen bahisler tekrar kontrol edilir

---

## 📦 Modüller Detayı

### `listener.js` (Ana Dosya - 369 satır)
| Özellik | Detay |
|---------|-------|
| Bağlantı | MTProto (Telegram userbot, bot değil!) |
| Kütüphane | `telegram` npm paketi |
| Session | String session (kalıcı oturum) |
| Retry | 5 deneme, WSS bağlantı |
| Scan Penceresi | Son 30 gün, 1000 mesaj limiti |

### `src/utils/parser.js` (87 satır) - Text Parser
**Filtre mantığı:**
- `"Daily BET from YRL BETS"` başlığı ZORUNLU
- `🔹` (maç adı) ve `🔸 Bet:` (seçim) ZORUNLU
- Sport: Emoji ile (⚽🏀🎾🏒🎮)

**Odds çıkarma stratejileri (sırayla):**
1. `@ 1.90` formatı (inline odds)
2. `Odds: 2.00` keyword araması
3. Tüm ondalıklı sayılar arasından tahmin

**Stake çıkarma:**
- `Stake: 3`, `3u`, `3/10`, `💎 3` formatları

### `src/utils/ocr.js` (392 satır) - OCR Motoru
**3 Geçişli OCR Sistemi:**

| Pass | Yöntem | Hedef |
|------|--------|-------|
| Pass 1 | Standart OCR | Gövde metni (stake, takımlar) |
| Pass 2 | Renk tersine çevirme | Header (beyaz üstü mavi) → Odds |
| Pass 3 | Üst %25 crop + 2x scale | Son çare header okuma |

**5 Odds Çıkarma Stratejisi (OCR sonrası):**
- A: Explicit keyword (`@`, `Single`, `Odds`)
- B: Parantez içi (`(1.83)`)
- C: Win/Bet amount oranı (en güvenilir) `€900 / €1647 = 1.83`
- D: Standalone decimal sayı
- E: `Single X.XX` pattern

**Akıllı Düzeltme:**
- `167` → `1.67` (OCR nokta kaçırma)
- `18` → `1.8` (tam sayı düzeltme)
- `0.72` → `1.72` (leading 1 kaçırma)

### `src/utils/resultChecker.js` (1294 satır!) - Sonuç Motoru
**5 API Kaynağı:**
1. **TheSportsDB** - Birincil (maç arama + takım arama)
2. **ESPN Unofficial API** - Futbol (17 lig), Basketbol, Hokey, Tenis
3. **TheSportsDB by Team** - Takım geçmişi
4. **Web Search** - Brave + DuckDuckGo HTML parse
5. **SofaScore API** - Son çare

**Spor Algılama:**
- Emoji ve keyword bazlı (`⚽`, `🏀`, `🎾`, `🏒`)
- Takım listesi bazlı heuristic (efes, cavaliers, penguins, alcaraz...)

**Fuzzy Matching:**
- Tam eşleşme → Substring eşleşme → Kelime bazlı eşleşme
- 150+ takım alias tanımı (TEAM_ALIASES)

**Skor Parse Stratejileri (HTML):**
- A: "defeated/beat/won" fiil bazlı
- B: "score of X-Y" context bazlı
- C: `TeamA X-Y TeamB` direkt pattern
- D: Tenis seti sayma
- E: Generic `X-Y` yakınlık araması

### Frontend Bileşenleri

| Bileşen | Boyut | İşlev |
|---------|-------|-------|
| `Dashboard.jsx` | 341 satır | Ana dashboard, istatistikler, bet listesi |
| `MartingaleSimulator.jsx` | 23KB | Martingale/Kelly/Fibonacci simülasyonu |
| `Chat.jsx` | 13KB | Telegram mesaj görüntüleme |
| `BetCard.jsx` | 6.5KB | Tek bet kartı UI |
| `StatsGeneral.jsx` | 5.7KB | Genel istatistik sayfası |
| `Login.jsx` | 5KB | Firebase Auth login |

---

## 💰 Dashboard İstatistikleri
- **Toplam Bahis Sayısı** (sadece win/loss)
- **Kazanma Oranı** (%)
- **Unit Kar/Zarar** (odds bazlı)
- **Euro Kar** (girilen stake × unit kar)
- **Win Streak** (son kaç kazandı)
- **Sparkline Grafikler** (7 noktalı mini chart)
- **Time Filter**: 7g / 30g / 90g / Tümü

---

## 🔥 Sistemin Güçlü Yanları

| # | Güçlü Yan | Neden Önemli |
|---|-----------|--------------|
| 1 | **Userbot (MTProto)** | Telegram Bot API'sinden değil, gerçek hesaptan dinliyor — hiçbir filtre kaçırmıyor |
| 2 | **3-Pass OCR** | Resimli mesajlarda bile odds/stake çekiyor |
| 3 | **5 API Kaynağı** | Sonuç bulunamazsa bir sonrakine geçiyor, çok nadir başarısız olur |
| 4 | **Fuzzy Match** | "Man Utd" → "Manchester United" gibi varyasyonları idare ediyor |
| 5 | **Anti-Duplicate** | Map tabanlı in-memory cache, N+1 Firestore çağrısını önlüyor |
| 6 | **Batch Write** | 500 işlem Firestore limiti korunuyor |
| 7 | **In-Memory Cache** | Aynı maç için API tekrar çağrılmıyor |
| 8 | **Graceful Shutdown** | SIGTERM/SIGINT yakalanıyor, temiz kapanma |

---

## ⚠️ Mevcut Sorunlar

| # | Sorun | Etki | Öncelik |
|---|-------|------|---------|
| 1 | **`start:worker` script yok** | render.yaml çalışmıyor | 🔴 Kritik |
| 2 | **Dummy HTTP server gereksiz** | Render artık yok, kod kirliliği | 🟡 Orta |
| 3 | **scripts/ çöplüğü** | 68 script dosyası! Çoğu tek kullanımlık | 🟡 Orta |
| 4 | **Scan penceresi 30 gün ama limit 1000** | Yoğun kanalda son 30 gün taranmayabilir | 🟡 Orta |
| 5 | **OCR temp dosyaları proje kök dizininde** | Dosya sistemi kirliliği | 🟢 Düşük |
| 6 | **Tenis sonuç doğruluğu zayıf** | ESPN tenis daha az güvenilir | 🟡 Orta |
| 7 | **Reconnect mantığı yok** | Telegram bağlantısı kopsa program durur | 🔴 Kritik |
| 8 | **Odds sanity check agresif** | Bazı yüksek odds'lar yanlış düzeltilebilir (>5) | 🟡 Orta |
| 9 | **Web Search scraping** | Brave/DuckDuckGo IP ban riski | 🟡 Orta |

---

## 🚀 Geliştirme Önerileri

### 🔴 Kritik (Hemen Yap)

#### 1. Telegram Reconnect Sistemi
```javascript
// Şu an yok! Bağlantı kopunca sistem durur.
// Eklenecek:
client.on('disconnected', async () => {
    console.log('🔄 Reconnecting...');
    await client.connect();
});

// Veya periodic health check:
setInterval(async () => {
    if (!client.connected) {
        await client.connect();
        console.log('✅ Reconnected!');
    }
}, 5 * 60 * 1000); // Her 5 dakika
```

#### 2. Error Recovery & Restart Script
```javascript
// process.js veya ecosystem.config.js (PM2)
// PM2 kendi kendine restart yapar
// ecosystem.config.js:
module.exports = {
    apps: [{
        name: 'yrl-listener',
        script: 'listener.js',
        watch: false,
        restart_delay: 5000,
        max_restarts: 10
    }]
}
```

---

### 🟡 Orta Öncelik (Bu Hafta)

#### 3. Scan Penceresi Dinamik Hale Getir
```javascript
// Şu an sabit 30 gün / 1000 mesaj
// Öneri: Son Firestore tarihinden itibaren tara
const lastBet = await db.collection('bets')
    .orderBy('timestamp', 'desc').limit(1).get();
const scanFrom = lastBet.empty 
    ? Date.now() - 30*24*60*60*1000 
    : lastBet.docs[0].data().timestamp;
```

#### 4. Bildirim Sistemi
```javascript
// Yeni bahis geldiğinde Telegram'a bildirim at
// Şu an sadece "Saved Messages"a yazıyor
// Eklenecek: Kaç bahis kaydedildi, sonuç ne çıktı gibi özet
await client.sendMessage("me", { 
    message: `📊 Günlük Özet:\n✅ ${wins} kazandı\n❌ ${losses} kaybetti\n💰 +${profit}u kar` 
});
```

#### 5. Odds Doğrulama İyileştirme
```javascript
// Şu an: odds > 5 ve tam sayı ise 1.X'e çevirme
// Problem: Bazı legit yüksek odds'lar bozuluyor
// Öneri: Sadece integer belirsizliklerini düzelt, float'lara dokunma
if (Number.isInteger(odds) && odds >= 5 && odds < 10) {
    // Bu kural çok agresif, kaldır veya daha iyi heuristic kullan
}
```

---

### 🟢 İyileştirme (Bu Ay)

#### 6. scripts/ Klasörünü Temizle
68 script dosyasının çoğu tek kullanımlık fix script.
```
scripts/
  ├── maintenance/    # Tek seferlik fix'ler (arşiv)
  ├── analytics/      # analyze_*.js dosyaları
  └── debug/          # debug_*.js dosyaları
```

#### 7. API Rate Limit Yönetimi
```javascript
// TheSportsDB ücretsiz API limiti var
// Şu an: Her resolved için 4-5 API çağrısı paralel değil
// Öneri: p-limit ile eşzamanlılığı sınırla
import pLimit from 'p-limit';
const limit = pLimit(3); // Max 3 eşzamanlı API çağrısı
```

#### 8. Dashboard: Gerçek Zamanlı Güncelleme
```javascript
// Şu an Firestore'dan tek seferlik veri çekilir
// Öneri: onSnapshot ile gerçek zamanlı dinleme
// (Firebase Firestore realtime updates)
const unsubscribe = db.collection('bets')
    .onSnapshot(snapshot => {
        // Yeni bahis anında dashboard'a yansır
    });
```

#### 9. Martingale Simülatörüne Gerçek Veri Bağlama
- Şu an simülatör manuel veri giriyor
- Gerçek Firestore bahisleriyle simülasyon yapılabilir

#### 10. Bildirim Kanalı: Telegram Bot
```javascript
// Şu an userbot "Saved Messages"a yazıyor
// Öneri: Ayrı bir Telegram Bot hesabı + grup oluştur
// Analiz özetleri, kayıplar için alert gönderebilir
```

---

## 🏠 Hosting Gerçeği

| Platform | Durum | Not |
|----------|-------|-----|
| Render.com | ❌ Worker tier ücretli | render.yaml var ama çalışmaz |
| Koyeb | ❌ Free tier kaldı | |
| Railway | ⚠️ $5 kredi | CC gerekli |
| Oracle Cloud | ✅ Gerçekten ücretsiz | CC ister, çekmez |
| **PM2 + Kendi Makinen** | ✅ Ücretsiz | En kolay yol |
| **Hetzner €3.29/ay** | 💵 Ucuz ama ücretli | Çok güvenilir |

### 🎯 Önerilen Çözüm: PM2 ile Lokal Çalıştırma
```bash
npm install -g pm2
pm2 start listener.js --name yrl-bets
pm2 save
pm2 startup  # Bilgisayar açılınca otomatik başlar
```

### 🎯 İkinci Seçenek: Oracle Cloud
- [cloud.oracle.com/free](https://cloud.oracle.com/free) → Kayıt ol
- 2x AMD VM ücretsiz (her zaman!)
- Ubuntu VM kur → `node listener.js` çalıştır → PM2 ekle

---

## 📊 Kod Kalitesi Özeti

| Metrik | Değer | Yorum |
|--------|-------|-------|
| Toplam backend LOC | ~2000 satır | Makul |
| resultChecker.js | 1294 satır | Çok büyük, bölünmeli |
| Hata yönetimi | %70 | Reconnect eksik |
| API çağrı verimliliği | İyi | Cache var |
| Duplicate koruması | Mükemmel | Map tabanlı |
| OCR kalitesi | İyi | 3-pass sistemi sağlam |
| Frontend kalitesi | Çok İyi | Glassmorphism, Recharts |
| Genel mimari | İyi | Ayrıştırılmış modüller |

---

*Sistem genel olarak iyi tasarlanmış. En büyük eksik: online ücretsiz hosting ve Telegram reconnect mantığı.*

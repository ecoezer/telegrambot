import fs from "fs";
import path from "path";
import Tesseract from "tesseract.js";
import { fileURLToPath } from 'url';
import { Jimp } from "jimp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let worker = null;

export const initOCR = async () => {
    if (!worker) {
        console.log("⚙️  Initializing generic Tesseract worker...");
        worker = await Tesseract.createWorker("eng");
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        });
        console.log("✅ OCR Worker Ready (PSM: 6).");
    }
    return worker;
};

export const terminateOCR = async () => {
    if (worker) {
        await worker.terminate();
        worker = null;
        console.log("🛑 OCR Worker Terminated.");
    }
};

// New Helper: Process image to invert colors (White on Blue -> Black on White-ish)
const processImageForHeader = async (inputPath, outputPath) => {
    try {
        const image = await Jimp.read(inputPath);
        // Normalize colors, increase contrast to max, invert, then threshold for binary text
        await image.normalize().greyscale().contrast(1).invert().threshold({ max: 200 }).write(outputPath);
    } catch (e) {
        console.error("❌ Image Processing Failed:", e);
    }
};

// New Helper: Crop Header Strip (Top 25%) and Bottom (Bottom 25%) for "Single - Odds"
const processImageForHeaderCrop = async (inputPath, outputPath) => {
    try {
        const image = await Jimp.read(inputPath);
        const w = image.bitmap.width;
        const h = image.bitmap.height;

        // Target Full Width Header (Top 25% - increased from 20%)
        // FIXED: Using object syntax for crop (Jimp v1.0+)
        await image.crop({ x: 0, y: 0, w: w, h: Math.floor(h * 0.25) })
            .scale(2) // Scale up 2x
            .normalize()
            .invert() // White text on blue -> Black on White
            .contrast(1) // High contrast
            .threshold({ max: 200 }) // Binarize background
            .write(outputPath);
    } catch (e) {
        console.error("❌ Header Crop Processing Failed:", e);
    }
};

export const performOCR = async (client, message) => {
    if (!message.media) return null;

    // Ensure worker is ready
    if (!worker) await initOCR();

    const tempPath = path.join(__dirname, `../../temp_bet_${message.id}.jpg`);
    const tempInvertedPath = path.join(__dirname, `../../temp_bet_inverted_${message.id}.jpg`);

    try {
        console.log("📸 Downloading media for OCR...", tempPath);
        const buffer = await client.downloadMedia(message.media);
        if (!buffer) {
            console.log("❌ Failed to download media.");
            return null;
        }

        fs.writeFileSync(tempPath, buffer);

        // --- PASS 1: Standard OCR (Best for Body Text: Stake, Teams) ---
        console.log("🔍 Running OCR Pass 1 (Standard)...");
        const { data: { text: textPass1 } } = await worker.recognize(tempPath);
        console.log(`📝 Text Pass 1:`, textPass1);

        let betData = parseOCRText(textPass1, message.date);

        // If we found everything (Odds + Stake), we are good.
        if (betData && betData.odds > 0 && betData.stake > 1) {
            console.log(`✅ OCR Success (Pass 1): Odds ${betData.odds}, Stake ${betData.stake}`);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            return betData;
        }

        // --- PASS 2: Inverted OCR (Targeting Header: Odds) ---
        // Only run if Odds are missing or betData is null
        if (!betData || !betData.odds || betData.odds === 0) {
            console.log("⚠️ Odds missing in Pass 1. Attempting Image Inversion for Header...");

            // Generate Inverted Image
            await processImageForHeader(tempPath, tempInvertedPath);

            // Re-run OCR on inverted image
            console.log("🔍 Running OCR Pass 2 (Inverted + High Contrast)...");
            const { data: { text: textPass2 } } = await worker.recognize(tempInvertedPath);
            console.log(`📝 Text Pass 2:`, textPass2.substring(0, 100).replace(/\n/g, ' '));

            const betDataPass2 = parseOCRText(textPass2, message.date);

            if (betDataPass2 && betDataPass2.odds > 0) {
                console.log(`💡 Found Odds in Pass 2: ${betDataPass2.odds}`);
                if (!betData) betData = {}; // Init if null
                betData.odds = betDataPass2.odds; // Merge Odds into main result
                // If Pass 1 was null, we might need other fields from Pass 2
                if (!betData.match) Object.assign(betData, betDataPass2);
            }
        }

        // --- PASS 3: Header Crop (Top 25%) ---
        // Only run if Odds are STILL missing
        if (!betData || !betData.odds || betData.odds === 0) {
            console.log("⚠️ Odds still missing. Attempting Header Crop (Top 25%)...");
            const tempHeaderCropPath = path.join(__dirname, `../../temp_bet_headercrop_${message.id}.jpg`);

            await processImageForHeaderCrop(tempPath, tempHeaderCropPath);

            console.log("🔍 Running OCR Pass 3 (Header Crop)...");
            const { data: { text: textPass3 } } = await worker.recognize(tempHeaderCropPath);
            console.log(`📝 Text Pass 3:`, textPass3.substring(0, 100).replace(/\n/g, ' '));

            const betDataPass3 = parseOCRText(textPass3, message.date);

            if (betDataPass3 && betDataPass3.odds > 0) {
                console.log(`💡 Found Odds in Pass 3: ${betDataPass3.odds}`);
                if (!betData) betData = {};
                betData.odds = betDataPass3.odds;
                if (!betData.match) Object.assign(betData, betDataPass3);
            }
            if (fs.existsSync(tempHeaderCropPath)) fs.unlinkSync(tempHeaderCropPath);
        }

        // Return combined result
        if (betData && (betData.odds > 0 || betData.stake > 1)) {
            console.log(`✅ Final OCR Result: Odds ${betData.odds}, Stake ${betData.stake}`);
            return betData;
        }

        console.log("⚠️ OCR failed to find valid Odds or Stake.");
        return null;

    } catch (ocrError) {
        console.error("❌ OCR Error:", ocrError);
        return null;
    } finally {
        // Always cleanup temp files, even on error
        const tempHeaderCropPath = path.join(__dirname, `../../temp_bet_headercrop_${message.id}.jpg`);
        [tempPath, tempInvertedPath, tempHeaderCropPath].forEach(f => {
            try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch { /* ignore */ }
        });
    }
};

// Helper to parse specific bet slip formats
const parseOCRText = (text, messageDate) => {
    // Clean up text
    const cleanText = text.replace(/\n/g, " ").replace(/\s+/g, " ");

    // 1. Stake Extraction
    const stakeRegex = /(?:Bet amount|Stake)(?:[^€$£\d]{0,40})?(?:€|\$|£)\s*([\d,]+\.?\d*)/i;
    const stakeMatch = cleanText.match(stakeRegex);
    let stake = 1;

    if (stakeMatch) {
        stake = parseFloat(stakeMatch[1].replace(/,/g, ""));
    } else {
        const simpleStakeRegex = /(?:Stake|Unit|Units|💎):?\s*(\d+(?:\.\d+)?)(?:\/10|u)?/i;
        const simpleMatch = cleanText.match(simpleStakeRegex);
        if (simpleMatch) {
            stake = parseFloat(simpleMatch[1]);
        }
    }

    // 2. Odds Extraction (5 strategies, from most to least specific)
    let odds = 0;

    // Strategy A: Explicit odds keyword (@, Single, Odds) followed by number
    const explicitOddsMatch = cleanText.match(/(?:@|Single|Odds|Cot|Quota)[\s—:|-]*(\d+[\.,]?\d*)(?!\s*(?:AM|PM|:|am|pm))/i);
    if (explicitOddsMatch) {
        let val = parseFloat(explicitOddsMatch[1].replace(',', '.'));
        if (val > 100 && val < 5000) val = val / 100;
        if (val > 1.0 && val < 50.0) odds = val;
    }

    // Strategy B: Odds in parentheses like (1.83) or (1.59 — common in bet slip OCR
    if (odds === 0) {
        const parenOddsMatch = cleanText.match(/\((\d+\.\d{1,2})(?:\s|\)|\||]|$)/);
        if (parenOddsMatch) {
            const val = parseFloat(parenOddsMatch[1]);
            if (val > 1.0 && val < 50.0) {
                console.log(`💡 Found Odds in parentheses: ${val}`);
                odds = val;
            }
        }
    }

    // Strategy C: Calculate from "Possible win" and "Bet amount" (MOST RELIABLE)
    // OCR text format: "Bet amount Possible win € 900.00 €1,647.00"
    // The two € amounts are: first = bet amount, second = possible win
    if (odds === 0) {
        // Find all € amounts in the text near "Possible win"
        const possibleWinSection = cleanText.match(/(?:Bet amount|Stake).*?(?:Possible win|Return|To Win)/i);
        if (possibleWinSection) {
            // Get the region around "Possible win" for amount extraction
            const winIdx = cleanText.indexOf('Possible win');
            const betIdx = cleanText.indexOf('Bet amount');
            if (winIdx > -1 || betIdx > -1) {
                const startIdx = Math.max(0, (betIdx > -1 ? betIdx : winIdx) - 10);
                const endIdx = Math.min(cleanText.length, (winIdx > -1 ? winIdx : betIdx) + 80);
                const region = cleanText.substring(startIdx, endIdx);

                // Extract all currency amounts in this region
                const amounts = [...region.matchAll(/€\s*([\d,]+\.?\d*)/g)].map(m =>
                    parseFloat(m[1].replace(/,/g, ''))
                ).filter(v => v > 0);

                if (amounts.length >= 2) {
                    // First amount = bet amount, second = possible win
                    const betAmt = Math.min(...amounts);
                    const winAmt = Math.max(...amounts);
                    if (winAmt > betAmt) {
                        const calcOdds = Math.round((winAmt / betAmt) * 100) / 100;
                        if (calcOdds > 1.01 && calcOdds < 50.0) {
                            console.log(`💡 Calculated Odds from Win/Stake: €${winAmt} / €${betAmt} = ${calcOdds}`);
                            odds = calcOdds;
                        }
                    }
                }
            }
        }

        // Fallback: try any two adjacent € amounts where second > first
        if (odds === 0) {
            const allAmounts = [...cleanText.matchAll(/€\s*([\d,]+\.?\d*)/g)].map(m =>
                parseFloat(m[1].replace(/,/g, ''))
            ).filter(v => v > 10);

            // Look for consecutive pairs where the ratio makes sense as odds
            for (let i = 0; i < allAmounts.length - 1; i++) {
                const a = allAmounts[i];
                const b = allAmounts[i + 1];
                if (b > a) {
                    const ratio = Math.round((b / a) * 100) / 100;
                    if (ratio > 1.01 && ratio < 50.0) {
                        console.log(`💡 Calculated Odds from adjacent amounts: €${b} / €${a} = ${ratio}`);
                        odds = ratio;
                        break;
                    }
                }
            }
        }
    }

    // Strategy D: Standalone decimal number (1.77, 2.10, etc.) not near currency
    if (odds === 0) {
        const allFloats = [...cleanText.matchAll(/(?<![€$£\d,])(\d+[\.,]\d{1,2})(?![,\d])/g)];
        for (const m of allFloats) {
            const val = parseFloat(m[1].replace(',', '.'));
            // Skip if this number appears with a currency symbol nearby
            const idx = m.index;
            const before = cleanText.substring(Math.max(0, idx - 45), idx).trim();
            if (/[€$£]/.test(before.substring(before.length - 3))) continue;
            
            // Skip if it looks like a handicap or over/under line (-3.5, +2.5, Over 2.5)
            // Look right before the number for minus, plus, or keywords
            if (/[-+]$/.test(before) || /(Handicap|Over|Under|Total)[^0-9]*$/i.test(before)) {
                console.log(`⚠️ Ignored ${val} as it appears to be a line/handicap, not odds.`);
                continue;
            }

            if (val > 1.0 && val < 50.0) {
                odds = val;
                break;
            }
        }
    }

    // Strategy E: Global fallback — look for "Single X.XX" pattern
    if (odds === 0) {
        const globalMatch = cleanText.match(/Single\s+(\d+\.?\d*)/i);
        if (globalMatch) {
            let val = parseFloat(globalMatch[1]);
            if (val > 100 && val < 5000) val = val / 100;
            if (val > 1.0 && val < 50.0) odds = val;
        }
    }

    // Heuristic: Stake from Cash Out
    if (stake === 1) {
        const notStarted = /Not started|Pending/i.test(cleanText);
        // NON-GREEDY .*? and ONLY look for currency symbols (no colons) to prevent matching "09:30 PM" as stake = 30
        const cashOutMatch = cleanText.match(/Cash out.*?(?:€|\$|£)\s*([\d,]+\.?\d*)/i);

        if (cashOutMatch && notStarted) {
            const cashOutValue = parseFloat(cashOutMatch[1].replace(/,/g, ""));
            if (cashOutValue > 10) {
                stake = cashOutValue;
                console.log(`💡 Inferred Stake from Cash Out: ${stake}`);
            }
        }

        // Final Fallback: If still 1 but there is an explicit € amount, take the first one larger than 5
        if (stake === 1) {
            const anyCurrencyMatch = cleanText.match(/(?:€|\$|£)\s*([\d,]{2,}\.?\d*)/);
            if (anyCurrencyMatch) {
                const currencyVal = parseFloat(anyCurrencyMatch[1].replace(/,/g, ""));
                if (currencyVal > 5) {
                    stake = currencyVal;
                    console.log(`💡 Inferred Stake from generic currency symbol: ${stake}`);
                }
            }
        }
    }

    // 3. Match/Selection Extraction
    const winnerRegex = /Winner.*,\s*([A-Za-z0-9 ]+)/i;
    const winnerMatch = cleanText.match(winnerRegex);

    const idRegex = /ID\s*(\d+)/i;
    const idMatch = cleanText.match(idRegex);
    const uniqueId = idMatch ? idMatch[1] : null;

    let match = "Unknown Match";
    let selection = "Unknown Selection";

    if (winnerMatch) {
        selection = winnerMatch[1].trim();
        match = `${selection} Match`;
    } else if (uniqueId) {
        match = `Bet Slip #${uniqueId}`;
    }

    // ── Odds Sanity Check ──
    // OCR often drops the decimal point: "1.8" → "18", "1.67" → "167"
    // Betting odds are almost never > 15 for single bets
    if (odds >= 100 && odds < 5000) {
        // e.g., 167 → 1.67, 188 → 1.88
        odds = Math.round((odds / 100) * 100) / 100;
    } else if (odds >= 10 && odds < 100 && Number.isInteger(odds)) {
        // e.g., 18 → 1.8, 16 → 1.6, 21 → 2.1
        odds = odds / 10;
    }

    // Odds <= 1 is NEVER valid for single bets (bookmaker needs margin)
    if (odds > 0 && odds <= 1.0) {
        // Likely OCR dropped leading "1": 0.72 → 1.72, 0.55 → 1.55
        if (odds > 0.01 && odds < 1.0) {
            console.log(`⚠️ Odds sanity: ${odds} → ${odds + 1} (likely missing leading 1)`);
            odds = Math.round((odds + 1) * 100) / 100;
        } else {
            console.log(`⚠️ Odds sanity: ${odds} is invalid, resetting to 0`);
            odds = 0;
        }
    }

    // Single bet odds > 5 are extremely rare — OCR likely dropped decimal
    // e.g., 5.5 → 1.55, 7 → 1.7
    if (odds >= 5 && odds < 10 && Number.isInteger(odds)) {
        console.log(`⚠️ Odds sanity: ${odds} → 1.${odds} (likely OCR decimal error)`);
        odds = parseFloat(`1.${odds}`);
    }

    if (odds === 0 && stake === 1) return null;

    // Date Handling
    const dateRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/i;
    const dateMatch = cleanText.match(dateRegex);
    let dateObj;

    if (dateMatch) {
        const timeStr = dateMatch[1];
        const dateStr = dateMatch[2];
        try {
            const [day, month, year] = dateStr.split('/');
            const combinedString = `${year}-${month}-${day} ${timeStr}`;
            dateObj = new Date(combinedString);

            if (isNaN(dateObj.getTime())) {
                console.log("⚠️ OCR Date Parse Failed (Invalid), falling back to message date.");
                dateObj = messageDate ? new Date(messageDate * 1000) : new Date();
            } else {
                console.log(`📅 Extracted Match Date: ${dateObj.toISOString()}`);
            }
        } catch (e) {
            console.log("⚠️ OCR Date Parse Error:", e);
            dateObj = messageDate ? new Date(messageDate * 1000) : new Date();
        }
    } else {
        dateObj = messageDate ? new Date(messageDate * 1000) : new Date();
    }

    return {
        match: match,
        selection: selection,
        odds: odds,
        stake: stake,
        sport: "Specials",
        status: 'pending',
        timestamp: dateObj.toISOString(),
        formattedDate: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(dateObj),
        source: 'OCR'
    };
};

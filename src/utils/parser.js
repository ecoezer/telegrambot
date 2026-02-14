
export const parseBetMessage = (text, messageDate) => {
    // Defensive: limit processing to reasonable length to prevent ReDoS on massive inputs
    if (text.length > 10000) return null;

    // Strictly match the header from the user's image
    if (!text.includes("Daily BET from YRL BETS")) return null;

    // Check for required elements
    if (!text.includes("🔹") || !text.includes("🔸")) return null;

    const sportRegex = /(?:🏀|⚽|🎾|🏒|🎮)\s*(.+)/;
    const matchRegex = /🔹\s*(.+)/;
    const betRegex = /🔸\s*Bet:\s*(.+)((?:\n|$))/;

    const sportMatch = text.match(sportRegex);
    const matchMatch = text.match(matchRegex);
    const betMatch = text.match(betRegex);

    if (!matchMatch || !betMatch) return null;

    const selectionRaw = betMatch[1].trim();
    let parsedOdds = 0;

    // 1. Try to find odds in the selection line (e.g. "Chelsea Win @ 1.90")
    const inlineOddsMatch = selectionRaw.match(/@\s*(\d+\.\d+)/) || selectionRaw.match(/(\d+\.\d+)$/);
    if (inlineOddsMatch) {
        parsedOdds = parseFloat(inlineOddsMatch[1]);
    } else {
        // 2. Global search for Odds in the whole text
        // Look for "Odds: 2.00" or similar
        const globalOddsMatch = text.match(/(?:Odds|Cot|Quota|Koeff|Kote|Odd):?\s*(\d+\.\d+)/i);
        if (globalOddsMatch) {
            parsedOdds = parseFloat(globalOddsMatch[1]);
        } else {
            // 3. Fallback: Find any standalone float between 1.01 and 100.0 that is NOT the stake
            // We'll do this after stake extraction to be safe, or just exclude lines with "Stake"
            // This is risky, but often odds are just a number on a line.
            // Let's look for a number with 2 decimals that isn't the stake.
        }
    }

    // Clean selection text (remove the odds part if found inline)
    const selection = inlineOddsMatch ? selectionRaw.replace(inlineOddsMatch[0], '').trim() : selectionRaw;

    // Extract Stake
    // Patterns: "Stake: 1", "Stake: 1/10", "1 Unit", "Stake: 2u", "💎 5/10"
    // Also "1u" or "5/10" without "Stake:" prefix if evident
    let parsedStake = 1;

    // Explicit "Stake: ..."
    const explicitStakeMatch = text.match(/(?:Stake|Unit|Units|💎):?\s*(\d+(?:\.\d+)?)(?:\/10|u)?/i);
    if (explicitStakeMatch) {
        parsedStake = parseFloat(explicitStakeMatch[1]);
    } else {
        // Implicit "5u" or "5/10"
        const implicitStakeMatch = text.match(/\b(\d+(?:\.\d+)?)u\b/i) || text.match(/\b(\d+(?:\.\d+)?)\/10\b/);
        if (implicitStakeMatch) {
            parsedStake = parseFloat(implicitStakeMatch[1]);
        }
    }

    // Final Odds Retry: usage of parsedStake to disambiguate?
    if (parsedOdds === 0) {
        // Find numbers like 1.50, 2.00, etc.
        // Exclude the stake number if we found one.
        const allFloats = [...text.matchAll(/\b(\d+\.\d{2})\b/g)].map(m => parseFloat(m[1]));
        // Filter out stake (simple equality check)
        const candidateOdds = allFloats.filter(f => f !== parsedStake);
        if (candidateOdds.length > 0) {
            parsedOdds = candidateOdds[0]; // Take the first valid-looking float
        }
    }

    return {
        sport: sportMatch ? sportMatch[1].trim() : "Unknown",
        match: matchMatch[1].trim(),
        selection: selection, // Cleaned selection
        raw: text,
        timestamp: messageDate ? new Date(messageDate * 1000).toISOString() : new Date().toISOString(),
        formattedDate: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(messageDate ? new Date(messageDate * 1000) : new Date()),
        status: 'pending',
        odds: parsedOdds,
        stake: parsedStake
    };
};

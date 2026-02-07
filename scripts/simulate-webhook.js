import dotenv from 'dotenv';
dotenv.config();

// Mock the context/events usually provided by Netlify
const mockEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({
        update_id: 123456789,
        message: {
            message_id: 111,
            from: {
                id: 987654321,
                is_bot: false,
                first_name: "Test",
                username: "TestUser"
            },
            chat: {
                id: 123456,
                first_name: "Test",
                username: "TestUser",
                type: "private"
            },
            date: 1678900000,
            text: `Daily BET from YRL BETS ❗️

🏀 Basketball - Euroleague 🇪🇺
🔹 Efes VS Zalgiris
🔸 Bet: Zalgiris Win

⏰ Gamesstart at 19:30 (GMT+2)`
        }
    })
};

console.log("Simulating Telegram Webhook...");

(async () => {
    try {
        // Dynamic import ensures dotenv is loaded first
        const { handler } = await import('../netlify/functions/telegram-hook.js');

        const result = await handler(mockEvent, {});
        console.log("Result:", result);
        if (result.statusCode === 200) {
            console.log("✅ Webhook processed successfully!");
        } else {
            console.log("❌ Webhook returned error status.");
        }
    } catch (error) {
        console.error("❌ Execution failed:", error);
    }
})();

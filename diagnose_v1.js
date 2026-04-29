const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;

console.log('--- v1 Endpoint Diagnostic ---');
console.log('API Key:', apiKey ? 'FOUND' : 'MISSING');

if (!apiKey) process.exit(1);

// Standard SDK initialization
const genAI = new GoogleGenerativeAI(apiKey);

async function runV1() {
    try {
        console.log('\nChecking gemini-1.5-flash on v1 endpoint...');
        // Note: The SDK typically picks the best version, but we try to force a simple call
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hi");
        console.log('  \u2705 SUCCESS: ' + (await result.response).text().substring(0, 10));
    } catch (e) {
        console.log('  \u274C v1/v1beta FAILED: ' + e.message);
        
        console.log('\nChecking RAW FETCH to v1 endpoint...');
        try {
            const fetch = require('node-fetch'); // Check if available
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
            });
            const data = await response.json();
            console.log('  Raw API Response:', JSON.stringify(data).substring(0, 100));
        } catch (fetchError) {
            console.log('  Raw fetch also failed or node-fetch missing.');
        }
    }
}

runV1();

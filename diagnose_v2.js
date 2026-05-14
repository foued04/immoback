const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function test() {
    console.log('Testing Key:', apiKey.substring(0, 8) + '...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
    ];

    for (const m of modelsToTry) {
        console.log(`\nTrying model: ${m}...`);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Hi");
            console.log(`✅ Success with ${m}:`, (await result.response).text());
            return;
        } catch (err) {
            console.log(`❌ Failed with ${m}:`, err.message);
        }
    }
}

test();

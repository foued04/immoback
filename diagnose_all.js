const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-pro",
    "gemini-1.0-pro",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp"
];

console.log('--- ULTIMATE Gemini Diagnostic ---');
console.log('API Key:', apiKey ? 'FOUND' : 'MISSING');

if (!apiKey) process.exit(1);

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(name) {
    try {
        console.log(`Checking ${name}...`);
        const model = genAI.getGenerativeModel({ model: name });
        const result = await model.generateContent("Hi");
        const response = await result.response;
        console.log(`  \u2705 WORKING! Response: ${response.text().substring(0, 20)}...`);
        return true;
    } catch (e) {
        console.log(`  \u274C FAILED: ${e.message.substring(0, 60)}...`);
        return false;
    }
}

async function runAll() {
    let anyWorking = false;
    for (const m of modelsToTry) {
        const ok = await testModel(m);
        if (ok) anyWorking = true;
    }

    if (!anyWorking) {
        console.log('\n\u274C ALL MODELS FAILED.');
        console.log('\u26A0 Probable Cause: Your API key is restricted, inactive, or the "Generative Language API" is not enabled in your Google Cloud Project.');
        console.log('  1. Go to https://aistudio.google.com/');
        console.log('  2. Create a NEW API Key.');
        console.log('  3. Ensure you can run a "Prompt" in their playground with that key.');
    } else {
        console.log('\n\u2705 Please update your code to use one of the WORKING models above.');
    }
}

runAll();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from the backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
const modelName = "gemini-1.5-flash"; // The model we are currently using

console.log('--- ImmoSmart Chatbot Diagnostics ---');
console.log('Checking API Key:', apiKey ? 'FOUND (starts with ' + apiKey.substring(0, 8) + '...)' : 'MISSING');
console.log('Target Model:', modelName);

if (!apiKey) {
    console.error('\u274C ERROR: GEMINI_API_KEY is missing from your .env file.');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function runDiagnostic() {
    try {
        console.log('\nConnecting to Google AI Studio...');
        
        // List models first to see what's available
        const listResults = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels ? 
                            await genAI.listModels() : { models: [] };
        
        console.log('Available Models for your key:');
        listResults.models?.forEach(m => console.log(`- ${m.name}`));

        const model = genAI.getGenerativeModel({ model: modelName });
        
        console.log('\nSending a test ping to the model...');
        const result = await model.generateContent("Utilise un seul mot pour répondre : OK.");
        const response = await result.response;
        const text = response.text();
        
        console.log('\n\u2705 SUCCESS!');
        console.log('Model Response:', text);
        console.log('\nYour API key and model are working perfectly.');
    } catch (error) {

        console.log('\n\u274C DIAGNOSTIC FAILED');
        console.log('-----------------------------------');
        console.log('Error Type:', error.constructor.name);
        console.log('Error Message:', error.message);
        
        if (error.message.includes('API_KEY_INVALID')) {
            console.log('\n\u26A0 REASON: Your API Key is invalid. Please double check it in AI Studio.');
        } else if (error.message.includes('model is not found')) {
            console.log('\n\u26A0 REASON: The model name is incorrect or not available for your key.');
        } else if (error.message.includes('quota')) {
            console.log('\n\u26A0 REASON: You have exceeded your API quota/limit.');
        } else {
            console.log('\n\u26A0 REASON: Unknown error. Check if your internet connection is active or if the key is restricted by region.');
        }
        console.log('-----------------------------------');
    }
}

runDiagnostic();

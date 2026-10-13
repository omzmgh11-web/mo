import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
    try {
        const response = await ai.models.generateContent({
            model: 'imagen-3.0-generate-002',
            contents: 'A clear photography of a badminton racket and shuttlecock on a court'
        });
        console.log("Success?", Object.keys(response));
        if (response.candidates) console.log(response.candidates[0]);
    } catch(e) {
        console.log("Error:", e.message);
    }
}
main();

import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: 'A clear photography of a badminton racket and shuttlecock on a court',
            number_of_images: 1
        });
        console.log("Success?", response);
    } catch(e) {
        console.log("Error:", e.message);
    }
}
main();

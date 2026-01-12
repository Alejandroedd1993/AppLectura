
import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

 const openaiTimeoutMs = Number.parseInt(process.env.OPENAI_TIMEOUT || '', 10);
 export const openai = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
   timeout: Number.isFinite(openaiTimeoutMs) ? openaiTimeoutMs : 45000,
 });

export const gemini = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

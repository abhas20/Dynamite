import dotenv from 'dotenv'

dotenv.config();

export const ai_config = {
    google_api_key: process.env.GEMINI_API_KEY || '',
    
}
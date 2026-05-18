import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import csv from 'csv-parser';

// 1. Load env vars
const envPath = path.resolve(process.cwd(), '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
  console.error('Could not read .env.local', e.message);
  process.exit(1);
}

const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].replace(/^["']|["']$/g, '');
        env[match[1]] = val;
    }
});

const SUPABASE_URL = env['SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];
const GEMINI_API_KEY = env['GEMINI_API_KEY'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
    console.error("Missing Supabase credentials or GEMINI_API_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const ADMIN_USER_ID = crypto.randomUUID();

// 2. Define structured output schema for Gemini
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: 'First name of the nanny' },
        experience: { type: Type.STRING, description: 'Experience in years or short text (e.g., "5 лет")' },
        metro: { type: Type.STRING, description: 'Nearest metro station, if specified. Otherwise null.', nullable: true },
        expectedRate: { type: Type.STRING, description: 'Expected monthly salary or hourly rate in rubles (digits only or short text like "100000")' },
        skills: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: 'List of top 3-5 unique skills extracted from the resume' 
        },
        childAges: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: 'Preferred child ages inferred from experience. Use values like "0-1 год", "1-3 года", "3-5 лет", "5-7 лет", "7+ лет"' 
        },
        about: { type: Type.STRING, description: 'A short 2-3 sentence summary about the nanny written in a warm, professional "trust-first" tone.' },
        softSkills: {
            type: Type.OBJECT,
            properties: {
                rawScore: { type: Type.INTEGER, description: 'Estimated soft skills rating from 60 to 99' },
                dominantStyle: { type: Type.STRING, description: 'One of: Structured, Balanced, Empathetic' },
                summary: { type: Type.STRING, description: '1-sentence summary of their emotional intelligence and approach' }
            }
        },
        riskProfile: {
            type: Type.OBJECT,
            properties: {
                tantrumFirstStep: { type: Type.STRING, description: 'calm, distract, or boundaries' },
                routineStyle: { type: Type.STRING, description: 'structured or adaptive' },
                disciplineStyle: { type: Type.STRING, description: 'gentle, strict, or structured' },
                communicationStyle: { type: Type.STRING, description: 'minimal, regular, or frequent' },
                pcmType: { type: Type.STRING, description: 'thinker, persister, harmonizer, rebel, imaginer, or promoter' }
            }
        }
    },
    required: ['name', 'experience', 'expectedRate', 'skills', 'childAges', 'about', 'softSkills', 'riskProfile']
};

// Rate limiting utility
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function parseResumeWithGemini(resumeText) {
    const prompt = `
Ты ассистент сервиса Blizko (премиальный подбор нянь). Проанализируй отклик (резюме) потенциальной няни с HH.ru.
Извлеки ключевые данные, а также спрогнозируй её софт-скиллы и психологический профиль (riskProfile), основываясь на тексте о себе и опыте.
Для "about" напиши теплое, но короткое профессиональное саммари.
Отклик/Резюме:
"""
${resumeText.substring(0, 5000)} // Truncating to avoid huge prompts
"""`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                temperature: 0.2, // Low temperature for deterministic extraction
            }
        });
        
        return JSON.parse(response.text());
    } catch (err) {
        console.error("Gemini API error:", err);
        return null;
    }
}

async function processHhExport(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const resumes = [];
    console.log("Reading CSV file...");

    // Assuming columns might contain 'Резюме', 'Имя', 'Желаемая зарплата', etc. 
    // We will dump the whole row into a text blob for Gemini to figure out.
    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => resumes.push(data))
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`Found ${resumes.length} rows to process.`);

    let successCount = 0;
    
    for (let i = 0; i < resumes.length; i++) {
        const rawRow = resumes[i];
        // Combine all columns into a readable text block
        const resumeText = Object.entries(rawRow)
            .map(([key, val]) => `${key}: ${val}`)
            .join('\n');
            
        console.log(`[${i+1}/${resumes.length}] Parsing resume with Gemini...`);
        const extracted = await parseResumeWithGemini(resumeText);
        
        if (!extracted) {
            console.log(`[${i+1}/${resumes.length}] Skipping due to parse error.`);
            continue;
        }

        const now = Date.now();
        const nannyId = crypto.randomUUID();

        const payload = {
            id: nannyId,
            type: 'nanny',
            name: `${extracted.name} (HH.ru)`,
            photo: `https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop`, // Placeholder
            city: 'Москва',
            district: 'Уточняется',
            metro: extracted.metro || 'Не указано',
            experience: extracted.experience,
            schedule: 'Уточняется', // HH standard schedule might be part of context
            expectedRate: extracted.expectedRate,
            childAges: extracted.childAges,
            skills: extracted.skills,
            about: extracted.about,
            contact: rawRow['Email'] || rawRow['Телефон'] || `hh_${nannyId.substring(0,6)}@blizko.app`,
            isVerified: false,
            documents: [], // To be uploaded during onboarding
            softSkills: {
                ...extracted.softSkills,
                completedAt: now
            },
            riskProfile: extracted.riskProfile,
            isNannySharing: false,
            createdAt: now
        };

        const dbRow = {
            id: nannyId,
            user_id: ADMIN_USER_ID,
            payload: payload
        };

        const { error } = await supabase.from('nannies').upsert(dbRow, { onConflict: 'id' });
        
        if (error) {
            console.error(`[${i+1}/${resumes.length}] Failed to insert into Supabase:`, error);
        } else {
            console.log(`[${i+1}/${resumes.length}] ✅ Inserted: ${extracted.name}`);
            successCount++;
        }

        // Rate limit mitigation (free tier Gemini is 15 RPM, but we assume paid tier or fast rate)
        await delay(2000); 
    }

    console.log(`\nImport complete. Successfully processed and imported ${successCount}/${resumes.length} nannies.`);
}

const inputPath = process.argv[2];
if (!inputPath) {
    console.log("Usage: node scripts/parseHhResponses.js <path-to-csv>");
    process.exit(1);
}

processHhExport(inputPath).catch(console.error);

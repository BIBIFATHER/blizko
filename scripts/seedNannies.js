import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually to avoid missing dependencies like dotenv
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const now = Date.now();
const ADMIN_USER_ID = crypto.randomUUID(); // Mock UUID for user_id since it's required by schema but we use service role

const nannies = [
    {
        id: crypto.randomUUID(),
        type: 'nanny',
        name: 'Елена (педагогическое образование)',
        photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
        city: 'Москва',
        district: 'СЗАО',
        metro: 'Щукинская',
        experience: '8 лет',
        schedule: '5/2, полный день',
        expectedRate: '180000',
        childAges: ['1-3 года', '3-5 лет'],
        skills: ['Развивающие игры', 'Подготовка к школе', 'Детский массаж', 'Приготовление еды'],
        about: 'Высшее педагогическое образование. Работала в частном детском саду 5 лет и в двух семьях. Придерживаюсь гуманистического подхода, мягкая адаптация, чёткий режим дня.',
        contact: 'test1@blizko.app',
        isVerified: true,
        documents: [{ type: 'passport', status: 'verified', aiConfidence: 99, aiNotes: 'Паспорт РФ, фото соответствует', verifiedAt: now }],
        softSkills: { rawScore: 92, dominantStyle: 'Structured', summary: 'Чётко соблюдает границы и режим, но проявляет высокую эмпатию к детям.', completedAt: now },
        riskProfile: { tantrumFirstStep: 'calm', routineStyle: 'structured', disciplineStyle: 'gentle', communicationStyle: 'regular', pcmType: 'persister' },
        isNannySharing: true,
        createdAt: now - 10000,
    },
    {
        id: crypto.randomUUID(),
        type: 'nanny',
        name: 'Мария (мед. образование)',
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
        city: 'Москва',
        district: 'ЮЗАО',
        metro: 'Академическая',
        experience: '12 лет',
        schedule: 'Частичная занятость (вечера, выходные)',
        expectedRate: '1200',
        childAges: ['0-1 год', '1-3 года'],
        skills: ['Медицинское образование', 'Уход за грудничками', 'Грудное вскармливание (консультант)'],
        about: 'Врач-педиатр по образованию. Помогаю мамам с новорожденными, знаю всё о детском сне и прикорме. Могу выходить на ночь или на несколько часов днём, чтобы мама отдохнула.',
        contact: 'test2@blizko.app',
        isVerified: true,
        documents: [{ type: 'medical_book', status: 'verified', aiConfidence: 98, aiNotes: 'Медкнижка действительна', verifiedAt: now }],
        softSkills: { rawScore: 88, dominantStyle: 'Balanced', summary: 'Спокойная, уверенная в себе, быстро реагирует на кризисные ситуации.', completedAt: now },
        riskProfile: { emergencyReady: 'yes', tantrumFirstStep: 'calm', disciplineStyle: 'structured', communicationStyle: 'frequent', pcmType: 'thinker' },
        isNannySharing: false,
        createdAt: now - 20000,
    },
    {
        id: crypto.randomUUID(),
        type: 'nanny',
        name: 'Анна (творческий подход)',
        photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
        city: 'Москва',
        district: 'ЦАО',
        metro: 'Маяковская',
        experience: '4 года',
        schedule: '5/2, частичная занятость (вторая половина дня)',
        expectedRate: '150000',
        childAges: ['5-7 лет', '7+ лет'],
        skills: ['Английский язык', 'Рисование/лепка', 'Сопровождение на кружки', 'Помощь с уроками'],
        about: 'Студентка старших курсов МГЛУ. Отлично лажу со школьниками, помогаю с английским и домашкой. Увлекаюсь живописью, можем рисовать с ребёнком. Очень активная, любим гулять в парках.',
        contact: 'test3@blizko.app',
        isVerified: true,
        documents: [],
        softSkills: { rawScore: 85, dominantStyle: 'Empathetic', summary: 'Очень креативная, легко находит общий язык со старшими детьми, становится для них старшим другом.', completedAt: now },
        riskProfile: { tantrumFirstStep: 'distract', routineStyle: 'adaptive', disciplineStyle: 'gentle', communicationStyle: 'regular', pcmType: 'harmonizer' },
        isNannySharing: true,
        createdAt: now - 30000,
    },
    {
        id: crypto.randomUUID(),
        type: 'nanny',
        name: 'Светлана (няня на час)',
        photo: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=400&h=400&fit=crop',
        city: 'Москва',
        district: 'ЗАО',
        metro: 'Раменки',
        experience: '3 года',
        schedule: 'По запросу',
        expectedRate: '800',
        childAges: ['1-3 года', '3-5 лет', '5-7 лет'],
        skills: ['Развивающие игры', 'Прогулки', 'Сопровождение'],
        about: 'Работаю бебиситтером, пунктуальная, активная. Люблю читать детям книги и придумывать квесты на детских площадках. Считаю, что экранное время нужно сводить к минимуму.',
        contact: 'test4@blizko.app',
        isVerified: true,
        documents: [],
        softSkills: { rawScore: 80, dominantStyle: 'Balanced', summary: 'Легко адаптируется к новым условиям и быстро устанавливает контакт.', completedAt: now },
        riskProfile: { tantrumFirstStep: 'calm', routineStyle: 'adaptive', disciplineStyle: 'gentle', communicationStyle: 'regular', pcmType: 'promoter' },
        isNannySharing: false,
        createdAt: now - 40000,
    },
    {
        id: crypto.randomUUID(),
        type: 'nanny',
        name: 'Татьяна (профессиональная гувернантка)',
        photo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop',
        city: 'Москва',
        district: 'ЗАО',
        metro: 'Кутузовская',
        experience: '15 лет',
        schedule: 'Вахта или 5/2',
        expectedRate: '250000',
        childAges: ['0-1 год', '1-3 года', '3-5 лет', '5-7 лет'],
        skills: ['Музыкальное образование', 'Раннее развитие по макро-методикам', 'Обучение манерам', 'Организация детского пространства'],
        about: 'Гувернантка премиум-класса. Музыкальное и педагогическое образование. Владею французским. Строгий, но сбалансированный режим, фокус на всестороннее развитие личности.',
        contact: 'test5@blizko.app',
        isVerified: true,
        documents: [{ type: 'recommendation_letter', status: 'verified', aiConfidence: 95, aiNotes: 'Рекомендации от 3 семей', verifiedAt: now }],
        softSkills: { rawScore: 98, dominantStyle: 'Structured', summary: 'Идеальная дисциплина, высокий уровень профессионализма в общении.', completedAt: now },
        riskProfile: { emergencyReady: 'yes', tantrumFirstStep: 'boundaries', routineStyle: 'structured', disciplineStyle: 'strict', communicationStyle: 'frequent', pcmType: 'thinker' },
        isNannySharing: false,
        createdAt: now - 50000,
    },
    {
        id: crypto.randomUUID(),
        type: 'nanny',
        name: 'Ольга (авто-няня)',
        photo: 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=400&h=400&fit=crop',
        city: 'Москва',
        district: 'САО',
        metro: 'Динамо',
        experience: '6 лет',
        schedule: 'Гибкий график',
        expectedRate: '1500',
        childAges: ['3-5 лет', '5-7 лет', '7+ лет'],
        skills: ['Авто-няня', 'Безаварийный стаж 10 лет', 'Помощь с уроками'],
        about: 'Забираю из школы/сада, везу на кружки, жду, отвожу домой, делаю уроки. Своя машина (комфорт-класс), автокресло. Спокойная, ответственная, сама мама двоих взрослых детей.',
        contact: 'test6@blizko.app',
        isVerified: true,
        documents: [],
        softSkills: { rawScore: 89, dominantStyle: 'Structured', summary: 'Высокая пунктуальность и ответственность на дорогах.', completedAt: now },
        riskProfile: { emergencyReady: 'yes', tantrumFirstStep: 'calm', routineStyle: 'structured', disciplineStyle: 'gentle', communicationStyle: 'regular', pcmType: 'persister' },
        isNannySharing: true,
        createdAt: now - 60000,
    },
    {
        id: crypto.randomUUID(),
        type: 'nanny',
        name: 'Нодира (бюджетная няня-помощница)',
        photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1bf98c?w=400&h=400&fit=crop',
        city: 'Москва',
        district: 'ВАО',
        metro: 'Новогиреево',
        experience: '5 лет',
        schedule: 'Полный день',
        expectedRate: '90000',
        childAges: ['1-3 года', '3-5 лет'],
        skills: ['Уборка', 'Готовка', 'Прогулки'],
        about: 'Добрая, чистоплотная. Обожаю готовить детскую еду. Полностью беру на себя быт (уборка, стирка, глажка) пока малыш спит. Люблю детей как своих.',
        contact: 'test7@blizko.app',
        isVerified: true,
        documents: [],
        softSkills: { rawScore: 78, dominantStyle: 'Empathetic', summary: 'Очень тёплая и заботливая, фокус на базовые потребности.', completedAt: now },
        riskProfile: { tantrumFirstStep: 'distract', routineStyle: 'adaptive', disciplineStyle: 'gentle', communicationStyle: 'minimal', pcmType: 'harmonizer' },
        isNannySharing: false,
        createdAt: now - 70000,
    },
    {
        id: crypto.randomUUID(),
        type: 'nanny',
        name: 'Виктория (спорт и развитие)',
        photo: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=400&h=400&fit=crop',
        city: 'Москва',
        district: 'ЮАО',
        metro: 'Тульская',
        experience: '2 года',
        schedule: 'Выходные',
        expectedRate: '1100',
        childAges: ['3-5 лет', '5-7 лет'],
        skills: ['Плавание', 'ЛФК', 'Активные игры'],
        about: 'Тренер по детскому плаванию и ЛФК. Идеальна для активных мальчишек — вымотаю на площадке так, что уснёт за минуту. Много энергии, современные взгляды на воспитание.',
        contact: 'test8@blizko.app',
        isVerified: true,
        documents: [],
        softSkills: { rawScore: 84, dominantStyle: 'Balanced', summary: 'Энергичная, умеет переводить агрессию в игру.', completedAt: now },
        riskProfile: { tantrumFirstStep: 'distract', routineStyle: 'adaptive', disciplineStyle: 'structured', communicationStyle: 'regular', pcmType: 'imaginer' },
        isNannySharing: true,
        createdAt: now - 80000,
    },
    {
        id: crypto.randomUUID(),
        type: 'nanny',
        name: 'Ирина (логопед-дефектолог)',
        photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
        city: 'Москва',
        district: 'ЮВАО',
        metro: 'Люблино',
        experience: '10 лет',
        schedule: 'Частичная занятость (по 2-3 часа)',
        expectedRate: '2000',
        childAges: ['3-5 лет', '5-7 лет'],
        skills: ['Логопед', 'Запуск речи', 'Подготовка к школе'],
        about: 'Действующий логопед. Беру деток на запуск речи и постановку звуков. Играем в лого-игры, занимаемся артикуляционной гимнастикой. Параллельно гуляем и общаемся.',
        contact: 'test9@blizko.app',
        isVerified: true,
        documents: [{ type: 'education_document', status: 'verified', aiConfidence: 96, aiNotes: 'Диплом дефектолога', verifiedAt: now }],
        softSkills: { rawScore: 90, dominantStyle: 'Structured', summary: 'Чётко видит цель, системный подход.', completedAt: now },
        riskProfile: { emergencyReady: 'yes', tantrumFirstStep: 'boundaries', routineStyle: 'structured', disciplineStyle: 'structured', communicationStyle: 'frequent', pcmType: 'thinker' },
        isNannySharing: false,
        createdAt: now - 90000,
    },
    {
        id: crypto.randomUUID(),
        type: 'nanny',
        name: 'Маргарита (Няня-бабушка)',
        photo: 'https://images.unsplash.com/photo-1544723795-3cj5a26d2e63?w=400&h=400&fit=crop',
        city: 'Москва',
        district: 'СВАО',
        metro: 'ВДНХ',
        experience: '20+ лет',
        schedule: '5/2',
        expectedRate: '120000',
        childAges: ['0-1 год', '1-3 года'],
        skills: ['Опыт с грудничками', 'Приготовление еды', 'Спокойные игры'],
        about: 'Вырастила троих детей и четверых внуков. Для тех, кто ищет теплую и покладистую классическую бабушку малышу. Пеку пирожки, вяжу носки, пою колыбельные.',
        contact: 'test10@blizko.app',
        isVerified: true,
        documents: [],
        softSkills: { rawScore: 82, dominantStyle: 'Empathetic', summary: 'Максимальный уровень тепла и заботы, безусловное принятие.', completedAt: now },
        riskProfile: { tantrumFirstStep: 'calm', routineStyle: 'adaptive', disciplineStyle: 'gentle', communicationStyle: 'regular', pcmType: 'harmonizer' },
        isNannySharing: false,
        createdAt: now - 100000,
    }
];

// Add generic reviews for some nannies to trigger the "Has reviews" TrustBadge
nannies[0].reviews = [
    { id: 'rev_1', authorName: 'Анна С.', rating: 5, text: 'Елена прекрасная няня! Ребенок ее обожает.', date: now - 86400000 },
    { id: 'rev_2', authorName: 'Михаил', rating: 5, text: 'Очень ответственная, всегда вовремя.', date: now - 172800000 }
];
nannies[4].reviews = [
    { id: 'rev_3', authorName: 'Семья В.', rating: 5, text: 'Нам очень повезло найти такую гувернантку. Дочь заговорила на французском через год.', date: now - 259200000 }
];

async function seed() {
    console.log(`Seeding ${nannies.length} nannies into Supabase...`);

    let successCount = 0;
    for (const nanny of nannies) {
        const row = {
            id: nanny.id,
            user_id: ADMIN_USER_ID, // Use a fake UUID if there's no real admin user
            payload: nanny,
        };

        // We try to upsert
        const { error } = await supabase.from('nannies').upsert(row, { onConflict: 'id' });
        if (error) {
            console.error(`Error inserting nanny ${nanny.name}:`, error);
        } else {
            successCount++;
        }
    }

    console.log(`Successfully seeded ${successCount}/${nannies.length} nannies!`);
}

seed().catch(console.error);

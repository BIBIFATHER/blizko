import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'node:url';

// Fail-closed seed-target guard (pure, unit-testable). Refuses unless an explicit
// non-production project ref is declared via BLIZKO_SEED_ALLOWED_REF and the
// configured SUPABASE_URL matches it. Forbidden production ref(s) are also read
// from env (BLIZKO_FORBIDDEN_PROD_REFS) — never hardcoded.
export function assertSeedTargetAllowed(supabaseUrl, { allowedRef, forbiddenRefs = [] } = {}) {
  const url = String(supabaseUrl || '');
  if (!url) throw new Error('SUPABASE_URL is required.');
  if (!allowedRef) {
    throw new Error(
      'set BLIZKO_SEED_ALLOWED_REF to the non-production project ref before seeding.',
    );
  }
  if (!url.includes(allowedRef)) {
    throw new Error('SUPABASE_URL is not the allowed non-production project.');
  }
  for (const ref of forbiddenRefs) {
    const trimmed = String(ref || '').trim();
    if (trimmed && url.includes(trimmed)) {
      throw new Error('SUPABASE_URL matches a forbidden production ref.');
    }
  }
}

// Clients are created only inside runCli so importing this module for tests has
// no side effects (no env read, no client, no seeding).
let supabase;
let ADMIN_USER_ID;

// Data arrays for procedural generation
const FIRST_NAMES = [
  'Елена',
  'Мария',
  'Анна',
  'Светлана',
  'Татьяна',
  'Ольга',
  'Нодира',
  'Виктория',
  'Ирина',
  'Маргарита',
  'Екатерина',
  'Дарья',
  'Наталья',
  'Юлия',
  'Анастасия',
  'Ксения',
  'Полина',
  'Алина',
  'Валерия',
  'Вера',
  'Надежда',
  'Любовь',
  'София',
  'Алиса',
  'Евгения',
  'Галина',
  'Нина',
  'Зинаида',
  'Людмила',
  'Валентина',
  'Гульнара',
  'Айгуль',
  'Динара',
  'Зарина',
  'Фарида',
  'Лейла',
  'Сабина',
  'Тамара',
  'Оксана',
  'Марина',
];

const METRO_STATIONS = [
  'Щукинская',
  'Академическая',
  'Маяковская',
  'Раменки',
  'Кутузовская',
  'Динамо',
  'Новогиреево',
  'Тульская',
  'Люблино',
  'ВДНХ',
  'Белорусская',
  'Киевская',
  'Строгино',
  'Крылатское',
  'Митино',
  'Сокольники',
  'Университет',
  'Проспект Вернадского',
  'Юго-Западная',
  'Тропарево',
  'Бутово',
  'Чертаново',
  'Царицыно',
  'Орехово',
  'Домодедовская',
  'Выхино',
  'Жулебино',
  'Новокосино',
  'Перово',
  'Шоссе Энтузиастов',
  'Бауманская',
  'Курская',
  'Таганская',
  'Павелецкая',
  'Добрынинская',
  'Октябрьская',
  'Парк Культуры',
  'Кропоткинская',
  'Арбатская',
  'Смоленская',
];

const DISTRICTS = [
  'ЦАО',
  'САО',
  'СВАО',
  'ВАО',
  'ЮВАО',
  'ЮАО',
  'ЮЗАО',
  'ЗАО',
  'СЗАО',
  'ЗелАО',
  'ТиНАО',
];

const AGE_RANGES = ['0-1 год', '1-3 года', '3-5 лет', '5-7 лет', '7+ лет'];

const SCHEDULES = [
  '5/2, полный день',
  'Частичная занятость (вечера, выходные)',
  '5/2, частичная занятость (вторая половина дня)',
  'По запросу',
  'Вахта или 5/2',
  'Гибкий график',
  'Полный день',
  'Выходные',
  'Частичная занятость (по 2-3 часа)',
];

const SKILL_POOL = [
  'Развивающие игры',
  'Подготовка к школе',
  'Детский массаж',
  'Приготовление еды',
  'Медицинское образование',
  'Уход за грудничками',
  'Грудное вскармливание (консультант)',
  'Английский язык',
  'Рисование/лепка',
  'Сопровождение на кружки',
  'Помощь с уроками',
  'Прогулки',
  'Сопровождение',
  'Музыкальное образование',
  'Раннее развитие по макро-методикам',
  'Обучение манерам',
  'Организация детского пространства',
  'Авто-няня',
  'Безаварийный стаж 10 лет',
  'Уборка',
  'Готовка',
  'Плавание',
  'ЛФК',
  'Активные игры',
  'Логопед',
  'Запуск речи',
  'Спокойные игры',
];

const ABOUT_TEMPLATES = [
  'Опыт работы {exp}. Люблю детей и легко нахожу с ними общий язык. Предпочитаю {skill1} и {skill2}.',
  'Педагогическое образование. Стаж {exp}. Отлично справляюсь с детьми возраста {age}. Мои сильные стороны: {skill1}, {skill2}.',
  'Вырастила своих детей, теперь помогаю другим семьям. Опыт {exp}. С удовольствием берусь за {skill1}. Также могу обеспечить {skill2}.',
  'Медицинское образование. Тщательно слежу за здоровьем и гигиеной. Опыт работы в семьях {exp}. Акцент на {skill1}.',
  'Студентка, ищу подработку. Опыт работы бебиситтером {exp}. Очень активная, люблю {skill1} и {skill2}.',
];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[randomInt(0, arr.length - 1)];
const randomSubset = (arr, maxItems) => {
  const count = randomInt(1, maxItems);
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

function generateNannyProfile(index) {
  const firstName = randomElement(FIRST_NAMES);
  const expYears = randomInt(1, 25);
  const expText = expYears === 1 ? '1 год' : expYears < 5 ? `${expYears} года` : `${expYears} лет`;

  const skill1 = randomElement(SKILL_POOL);
  let skill2 = randomElement(SKILL_POOL);
  while (skill2 === skill1) skill2 = randomElement(SKILL_POOL);

  const rawAbout = randomElement(ABOUT_TEMPLATES);
  const agePref = randomSubset(AGE_RANGES, 3);

  const about = rawAbout
    .replace('{exp}', expText)
    .replace('{skill1}', skill1.toLowerCase())
    .replace('{skill2}', skill2.toLowerCase())
    .replace('{age}', agePref.join(', '));

  const isHourly = Math.random() > 0.5;
  const expectedRate = isHourly ? String(randomInt(500, 2500)) : String(randomInt(60000, 200000));

  const now = Date.now();

  // Randomizing photo IDs from Unsplash (just using a few deterministic ones based on index for variety)
  const photoIds = [
    '1544005313-94ddf0286df2',
    '1573496359142-b8d87734a5a2',
    '1580489944761-15a19d654956',
    '1595152772835-219674b2a8a6',
    '1551836022-d5d88e9218df',
    '1587614382346-4ec70e388b28',
    '1531123897727-8f129e1bf98c',
    '1524250502761-1ac6f2e30d43',
    '1438761681033-6461ffad8d80',
    '1544723795-3cj5a26d2e63',
  ];
  const photoId = photoIds[index % photoIds.length];

  return {
    id: crypto.randomUUID(),
    type: 'nanny',
    name: `${firstName} (hh.ru импорт)`,
    photo: `https://images.unsplash.com/photo-${photoId}?w=400&h=400&fit=crop`,
    city: 'Москва',
    district: randomElement(DISTRICTS),
    metro: randomElement(METRO_STATIONS),
    experience: expText,
    schedule: randomElement(SCHEDULES),
    expectedRate: expectedRate,
    childAges: agePref,
    skills: randomSubset(SKILL_POOL, 5),
    about: about,
    contact: `import_${index}@blizko.app`,
    isVerified: Math.random() > 0.2,
    documents:
      Math.random() > 0.5
        ? [
            {
              type: 'passport',
              status: 'verified',
              aiConfidence: randomInt(80, 99),
              aiNotes: 'Проверено ИИ',
              verifiedAt: now,
            },
          ]
        : [],
    softSkills: {
      rawScore: randomInt(60, 99),
      dominantStyle: randomElement(['Structured', 'Balanced', 'Empathetic']),
      summary: 'Автоматически сгенерированный профиль из hh.ru.',
      completedAt: now,
    },
    riskProfile: {
      tantrumFirstStep: randomElement(['calm', 'distract', 'boundaries']),
      routineStyle: randomElement(['structured', 'adaptive']),
      disciplineStyle: randomElement(['gentle', 'strict', 'structured']),
      communicationStyle: randomElement(['minimal', 'regular', 'frequent']),
      pcmType: randomElement([
        'thinker',
        'persister',
        'harmonizer',
        'rebel',
        'imaginer',
        'promoter',
      ]),
    },
    isNannySharing: Math.random() > 0.7,
    createdAt: now - randomInt(10000, 10000000),
  };
}

async function seed() {
  const TOTAL_PROFILES = 150;
  console.log(`Generating and seeding ${TOTAL_PROFILES} nanny profiles into Supabase...`);

  const nannies = [];
  for (let i = 0; i < TOTAL_PROFILES; i++) {
    nannies.push(generateNannyProfile(i));
  }

  let successCount = 0;

  // Batch inserts for efficiency
  const BATCH_SIZE = 50;
  for (let i = 0; i < nannies.length; i += BATCH_SIZE) {
    const batch = nannies.slice(i, i + BATCH_SIZE);
    const rows = batch.map((nanny) => ({
      id: nanny.id,
      user_id: ADMIN_USER_ID,
      payload: nanny,
    }));

    const { error } = await supabase.from('nannies').upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
    } else {
      successCount += batch.length;
      console.log(`Successfully inserted batch ${i / BATCH_SIZE + 1} (${batch.length} profiles)`);
    }
  }

  console.log(`\nSuccessfully seeded ${successCount}/${TOTAL_PROFILES} nannies!`);
}

function runCli() {
  if (process.env.HH_SEED_SYNTHETIC !== '1') {
    console.error(
      'Blocked: this legacy seeder writes synthetic nanny profiles with privileged credentials. ' +
        'Set HH_SEED_SYNTHETIC=1 only for an explicitly non-production Supabase project.',
    );
    process.exit(1);
  }

  const envPath = path.resolve(process.cwd(), '.env.local');
  let envContent = '';
  try {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } catch (e) {
    console.error('Could not read .env.local', e.message);
    process.exit(1);
  }

  const env = {};
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  });

  const SUPABASE_URL = env['SUPABASE_URL'];
  const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  try {
    assertSeedTargetAllowed(SUPABASE_URL, {
      allowedRef: process.env.BLIZKO_SEED_ALLOWED_REF,
      forbiddenRefs: (process.env.BLIZKO_FORBIDDEN_PROD_REFS || '').split(','),
    });
  } catch (e) {
    console.error(`Blocked: ${e.message}`);
    process.exit(1);
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  ADMIN_USER_ID = crypto.randomUUID();
  seed().catch(console.error);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}

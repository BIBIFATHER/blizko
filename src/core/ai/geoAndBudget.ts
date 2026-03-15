/**
 * Moscow districts proximity map.
 * Groups: districts within same group are "nearby" (+10 to score).
 * Exact district match = +20.
 */

// District groups — geographically close districts
const DISTRICT_GROUPS: Record<string, string[]> = {
    'цао': ['тверской', 'арбат', 'пресненский', 'басманный', 'мещанский', 'красносельский', 'таганский', 'замоскворечье', 'якиманка', 'хамовники'],
    'сао': ['аэропорт', 'беговой', 'бескудниковский', 'войковский', 'головинский', 'дмитровский', 'западное дегунино', 'восточное дегунино', 'коптево', 'левобережный', 'молжаниновский', 'савёловский', 'сокол', 'тимирязевский', 'ховрино'],
    'свао': ['алтуфьевский', 'бабушкинский', 'бибирево', 'бутырский', 'лианозово', 'лосиноостровский', 'марфино', 'медведково', 'отрадное', 'останкинский', 'ростокино', 'свиблово', 'ярославский'],
    'вао': ['богородское', 'вешняки', 'восточный', 'гольяново', 'ивановское', 'измайлово', 'косино-ухтомский', 'метрогородок', 'новогиреево', 'новокосино', 'перово', 'преображенское', 'соколиная гора', 'сокольники'],
    'ювао': ['выхино-жулебино', 'капотня', 'кузьминки', 'лефортово', 'люблино', 'марьино', 'некрасовка', 'нижегородский', 'печатники', 'рязанский', 'текстильщики', 'южнопортовый'],
    'юао': ['бирюлёво', 'братеево', 'даниловский', 'донской', 'зябликово', 'москворечье-сабурово', 'нагатино-садовники', 'нагатинский затон', 'нагорный', 'орехово-борисово', 'царицыно', 'чертаново'],
    'юзао': ['академический', 'гагаринский', 'зюзино', 'коньково', 'котловка', 'ломоносовский', 'обручевский', 'тёплый стан', 'черёмушки', 'ясенево'],
    'зао': ['внуково', 'дорогомилово', 'крылатское', 'кунцево', 'можайский', 'ново-переделкино', 'очаково-матвеевское', 'проспект вернадского', 'раменки', 'солнцево', 'тропарёво-никулино', 'филёвский парк', 'фили-давыдково'],
    'сзао': ['куркино', 'митино', 'покровское-стрешнево', 'северное тушино', 'южное тушино', 'строгино', 'хорошёво-мнёвники', 'щукино'],
};

// Metro line proximity — stations on same line or adjacent lines are "nearby"
const METRO_LINES: Record<string, string[]> = {
    'красная': ['бульвар рокоссовского', 'черкизовская', 'преображенская площадь', 'сокольники', 'красносельская', 'комсомольская', 'красные ворота', 'чистые пруды', 'лубянка', 'охотный ряд', 'библиотека им. ленина', 'кропоткинская', 'парк культуры', 'фрунзенская', 'спортивная', 'воробьёвы горы', 'университет', 'проспект вернадского', 'юго-западная', 'тропарёво', 'румянцево', 'саларьево'],
    'зелёная': ['ховрино', 'беломорская', 'речной вокзал', 'водный стадион', 'войковская', 'сокол', 'аэропорт', 'динамо', 'белорусская', 'маяковская', 'тверская', 'театральная', 'новокузнецкая', 'павелецкая', 'автозаводская', 'технопарк', 'коломенская', 'каширская', 'кантемировская', 'царицыно', 'орехово', 'домодедовская', 'красногвардейская', 'алма-атинская'],
    'синяя': ['мякинино', 'волоколамская', 'митино', 'пятницкое шоссе', 'строгино', 'крылатское', 'молодёжная', 'кунцевская', 'славянский бульвар', 'парк победы', 'киевская', 'арбатская', 'площадь революции', 'курская', 'бауманская', 'электрозаводская', 'семёновская', 'партизанская', 'измайловская', 'первомайская', 'щёлковская'],
    'оранжевая': ['медведково', 'бабушкинская', 'свиблово', 'ботанический сад', 'вднх', 'алексеевская', 'рижская', 'проспект мира', 'сухаревская', 'тургеневская', 'китай-город', 'третьяковская', 'октябрьская', 'шаболовская', 'ленинский проспект', 'академическая', 'профсоюзная', 'новые черёмушки', 'калужская', 'беляево', 'коньково', 'тёплый стан', 'ясенево', 'новоясеневская'],
    'фиолетовая': ['планерная', 'сходненская', 'тушинская', 'спартак', 'щукинская', 'октябрьское поле', 'полежаевская', 'беговая', 'улица 1905 года', 'баррикадная', 'пушкинская', 'кузнецкий мост', 'китай-город', 'таганская', 'пролетарская', 'волгоградский проспект', 'текстильщики', 'кузьминки', 'рязанский проспект', 'выхино', 'лермонтовский проспект', 'жулебино', 'котельники'],
};

// Nearby district group pairs (geographically adjacent)
const ADJACENT_GROUPS: [string, string][] = [
    ['цао', 'сао'], ['цао', 'свао'], ['цао', 'вао'], ['цао', 'ювао'],
    ['цао', 'юао'], ['цао', 'юзао'], ['цао', 'зао'], ['цао', 'сзао'],
    ['сао', 'свао'], ['сао', 'сзао'],
    ['свао', 'вао'],
    ['вао', 'ювао'],
    ['ювао', 'юао'],
    ['юао', 'юзао'],
    ['юзао', 'зао'],
    ['зао', 'сзао'],
    ['сзао', 'сао'],
];

function normGeo(s?: string): string {
    return (s ?? '').trim().toLowerCase().replace(/ё/g, 'е');
}

function findDistrictGroup(district: string): string | null {
    const d = normGeo(district);
    for (const [group, districts] of Object.entries(DISTRICT_GROUPS)) {
        if (group === d || districts.some(dd => normGeo(dd) === d || d.includes(normGeo(dd)))) {
            return group;
        }
    }
    return null;
}

function areGroupsAdjacent(g1: string, g2: string): boolean {
    return ADJACENT_GROUPS.some(
        ([a, b]) => (a === g1 && b === g2) || (a === g2 && b === g1)
    );
}

function areMetroNearby(m1: string, m2: string): boolean {
    const nm1 = normGeo(m1);
    const nm2 = normGeo(m2);
    if (nm1 === nm2) return true;
    for (const stations of Object.values(METRO_LINES)) {
        const normed = stations.map(normGeo);
        const i1 = normed.findIndex(s => s.includes(nm1) || nm1.includes(s));
        const i2 = normed.findIndex(s => s.includes(nm2) || nm2.includes(s));
        if (i1 !== -1 && i2 !== -1 && Math.abs(i1 - i2) <= 5) return true;
    }
    return false;
}

/**
 * Calculate geo proximity score (0-20)
 */
export function geoScore(
    parentDistrict?: string, parentMetro?: string, parentCity?: string,
    nannyDistrict?: string, nannyMetro?: string, nannyCity?: string
): { score: number; reason: string | null } {
    // 1. Exact district match → +20
    if (parentDistrict && nannyDistrict && normGeo(parentDistrict) === normGeo(nannyDistrict)) {
        return { score: 20, reason: 'Один район' };
    }

    // 2. Same metro station → +18
    if (parentMetro && nannyMetro && normGeo(parentMetro) === normGeo(nannyMetro)) {
        return { score: 18, reason: 'Одна станция метро' };
    }

    // 3. Nearby metro (≤5 stations on same line) → +14
    if (parentMetro && nannyMetro && areMetroNearby(parentMetro, nannyMetro)) {
        return { score: 14, reason: 'Метро рядом (≤5 станций)' };
    }

    // 4. Adjacent district groups → +10
    const parentGroup = parentDistrict ? findDistrictGroup(parentDistrict) : null;
    const nannyGroup = nannyDistrict ? findDistrictGroup(nannyDistrict) : null;
    if (parentGroup && nannyGroup) {
        if (parentGroup === nannyGroup) {
            return { score: 15, reason: 'Один округ' };
        }
        if (areGroupsAdjacent(parentGroup, nannyGroup)) {
            return { score: 10, reason: 'Соседний округ' };
        }
        // Different non-adjacent groups in Moscow → +5
        return { score: 5, reason: 'Москва, другой округ' };
    }

    // 5. Same city (fallback) → +5
    const pc = normGeo(parentCity);
    const nc = normGeo(nannyCity);
    if (pc && nc && (nc.includes(pc) || pc.includes(nc))) {
        return { score: 5, reason: 'Один город' };
    }

    return { score: 0, reason: null };
}

/**
 * Calculate budget compatibility score (0-15)
 * Returns negative to signal hard filter (exclude)
 */
export function budgetScore(
    parentBudget?: string,
    nannyRate?: string
): { score: number; reason: string | null; exclude: boolean } {
    const budgetNum = parseRuMoney(parentBudget);
    const rateNum = parseRuMoney(nannyRate);

    if (!budgetNum || !rateNum) {
        return { score: 0, reason: null, exclude: false };
    }

    const ratio = rateNum / budgetNum;

    // Hard filter: nanny rate > 2x parent budget
    if (ratio > 2) {
        return { score: 0, reason: null, exclude: true };
    }

    // Exact match (within ±10%)
    if (ratio >= 0.9 && ratio <= 1.1) {
        return { score: 15, reason: 'Ставка точно в бюджете', exclude: false };
    }

    // Close match (within ±20%)
    if (ratio >= 0.8 && ratio <= 1.2) {
        return { score: 12, reason: 'Ставка близка к бюджету', exclude: false };
    }

    // Acceptable (within ±50%)
    if (ratio >= 0.5 && ratio <= 1.5) {
        return { score: 8, reason: 'Ставка в допустимом диапазоне', exclude: false };
    }

    // Outside range but not excluded
    return { score: 3, reason: null, exclude: false };
}

function parseRuMoney(s?: string): number | null {
    if (!s) return null;
    // Extract numbers: "1500 ₽/час" → 1500, "от 1000" → 1000, "1 500" → 1500
    const cleaned = s.replace(/\s/g, '').replace(/[^\d]/g, '');
    const num = parseInt(cleaned, 10);
    return num > 0 ? num : null;
}

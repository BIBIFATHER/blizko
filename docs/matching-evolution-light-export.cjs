/* global __dirname, console, process */

const path = require('path');
const PptxGenJS = require('pptxgenjs');

const outputPptxPath = path.resolve(__dirname, 'matching-evolution-light.pptx');

const COLORS = {
  bg: 'FDFBF7',
  text: '1F2937',
  muted: '6B7280',
  accent: '0EA5E9',
  blueBg: 'E0F2FE',
  blueBorder: 'BAE6FD',
  amberBg: 'FEF3C7',
  amberBorder: 'FDE68A',
  roseBg: 'FFE4E6',
  roseBorder: 'FECDD3',
  sageBg: 'DCFCE7',
  sageBorder: '86EFAC',
  cardFill: 'FFFDF9',
  cardLine: 'E7E5E4',
  green: '4ADE80',
  amber: 'FBBF24',
  purple: 'C084FC',
  slate: '94A3B8',
};

function addBackground(slide) {
  slide.background = { color: COLORS.bg };
  slide.addShape('ellipse', {
    x: 9.8, y: -0.4, w: 3.8, h: 2.8,
    fill: { color: 'DBF0FF', transparency: 30 },
    line: { color: 'DBF0FF', transparency: 100 },
  });
  slide.addShape('ellipse', {
    x: -0.8, y: 5.2, w: 3.4, h: 2.4,
    fill: { color: 'FFF4C7', transparency: 35 },
    line: { color: 'FFF4C7', transparency: 100 },
  });
  slide.addShape('ellipse', {
    x: 3.7, y: 2.1, w: 2.6, h: 2,
    fill: { color: 'FFE8F0', transparency: 45 },
    line: { color: 'FFE8F0', transparency: 100 },
  });
}

function addPill(slide, text, opts) {
  slide.addText(text, {
    x: opts.x, y: opts.y, w: opts.w, h: 0.32,
    fontFace: 'Manrope',
    fontSize: 9,
    bold: true,
    color: opts.textColor,
    align: 'center',
    valign: 'mid',
    fill: { color: opts.fill },
    line: { color: opts.line, pt: 1 },
    margin: 0.04,
    radius: 0.16,
  });
}

function addCard(slide, opts) {
  slide.addText('', {
    x: opts.x, y: opts.y, w: opts.w, h: opts.h,
    fill: { color: COLORS.cardFill, transparency: 8 },
    line: { color: COLORS.cardLine, pt: 1 },
    radius: 0.22,
    shadow: { type: 'outer', color: 'D6D3D1', blur: 1, angle: 45, distance: 1, opacity: 0.12 },
  });
}

function addTitle(slide, text, x, y, w) {
  slide.addText(text, {
    x, y, w, h: 1.1,
    fontFace: 'Newsreader',
    fontSize: 24,
    color: COLORS.text,
    bold: false,
    breakLine: false,
    margin: 0,
  });
}

function addBody(slide, text, x, y, w, h, fontSize = 12) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: 'Manrope',
    fontSize,
    color: COLORS.muted,
    margin: 0,
    valign: 'top',
    breakLine: false,
    fit: 'shrink',
  });
}

function addBulletList(slide, items, x, y, w) {
  slide.addText(items.map((item) => ({
    text: item,
    options: { bullet: { indent: 14 } },
  })), {
    x, y, w, h: 2,
    fontFace: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
    breakLine: true,
    paraSpaceAfterPt: 10,
    margin: 0,
    fit: 'shrink',
  });
}

function buildSlide1(pptx) {
  const slide = pptx.addSlide();
  addBackground(slide);

  addPill(slide, 'Trust-First Architecture', {
    x: 0.7, y: 0.68, w: 2.35,
    fill: COLORS.blueBg, line: COLORS.blueBorder, textColor: '0369A1',
  });
  slide.addText('Эволюция\nМатчинга', {
    x: 0.7, y: 1.22, w: 5.5, h: 1.8,
    fontFace: 'Newsreader',
    fontSize: 28,
    color: COLORS.text,
    margin: 0,
  });
  addBody(
    slide,
    'От детерминированной математики и эвристики к системе, которая учится на реальных исходах и повышает шанс на долгий, спокойный fit между семьей и няней.',
    0.72, 3.02, 5.2, 1.35, 14
  );

  addCard(slide, { x: 7.08, y: 0.78, w: 5.1, h: 5.7 });
  slide.addShape('ellipse', {
    x: 8.55, y: 1.6, w: 2.15, h: 2.15,
    line: { color: COLORS.blueBorder, pt: 1.5, dash: 'dash' },
    fill: { color: COLORS.bg, transparency: 100 },
  });
  slide.addShape('ellipse', {
    x: 9.15, y: 2.18, w: 0.95, h: 0.95,
    line: { color: COLORS.accent, transparency: 100 },
    fill: { color: COLORS.accent, transparency: 82 },
  });
  slide.addShape('chevron', {
    x: 8.67, y: 2.08, w: 1.9, h: 1.15,
    rotate: 90,
    line: { color: '38BDF8', transparency: 100 },
    fill: { color: '38BDF8', transparency: 60 },
  });
  slide.addShape('ellipse', {
    x: 8.43, y: 2.53, w: 0.12, h: 0.12,
    line: { color: '0284C7', transparency: 100 },
    fill: { color: '0284C7' },
  });
  slide.addShape('ellipse', {
    x: 10.63, y: 2.53, w: 0.12, h: 0.12,
    line: { color: '0284C7', transparency: 100 },
    fill: { color: '0284C7' },
  });
  slide.addText('Две системы. Одна цель.', {
    x: 7.75, y: 4.78, w: 3.8, h: 0.32,
    fontFace: 'Newsreader',
    fontSize: 14,
    color: COLORS.text,
    align: 'center',
    margin: 0,
  });
  addBody(
    slide,
    'Дать надежный результат сегодня и собрать обучающий контур для более умного подбора завтра.',
    7.55, 5.18, 4.2, 0.7, 10
  );
}

function buildSlide2(pptx) {
  const slide = pptx.addSlide();
  addBackground(slide);

  addPill(slide, 'Phase 1: В продакшене', {
    x: 0.75, y: 0.58, w: 2.15,
    fill: COLORS.sageBg, line: COLORS.sageBorder, textColor: '166534',
  });
  addTitle(slide, 'Логика. Цифры. Эвристика.', 0.74, 1.08, 5.5);

  addCard(slide, { x: 0.75, y: 2.0, w: 6.45, h: 4.7 });
  addCard(slide, { x: 7.45, y: 2.0, w: 2.5, h: 2.22 });
  addCard(slide, { x: 10.08, y: 2.0, w: 2.5, h: 2.22 });

  slide.addText('1', {
    x: 1.05, y: 2.3, w: 0.38, h: 0.38,
    fontFace: 'Newsreader', fontSize: 18, color: COLORS.green, bold: false,
    align: 'center', valign: 'mid',
    shape: 'ellipse',
    fill: { color: 'FFFFFF' }, line: { color: 'E5E7EB', pt: 1 },
    margin: 0,
  });
  slide.addText('Logistic & Budget Math', {
    x: 1.7, y: 2.28, w: 3.4, h: 0.35,
    fontFace: 'Newsreader', fontSize: 17, color: COLORS.text, margin: 0,
  });
  addBody(
    slide,
    'Гео-проксимити (+20 баллов за район, +18 за метро) и жесткие фильтры финансовой совместимости (отсечение при x2).',
    1.05, 2.78, 5.45, 0.8, 11
  );
  addBody(slide, 'District Match', 1.05, 4.0, 1.5, 0.25, 9);
  addBody(slide, '+20 pts', 5.85, 4.0, 0.6, 0.25, 9);
  slide.addShape('roundRect', {
    x: 1.05, y: 4.3, w: 5.4, h: 0.08,
    radius: 0.04, fill: { color: 'E2E8F0' }, line: { color: 'E2E8F0', transparency: 100 },
  });
  slide.addShape('roundRect', {
    x: 1.05, y: 4.3, w: 5.4, h: 0.08,
    radius: 0.04, fill: { color: COLORS.green }, line: { color: COLORS.green, transparency: 100 },
  });
  addBody(slide, 'Same Metro Line', 1.05, 4.72, 1.7, 0.25, 9);
  addBody(slide, '+14 pts', 5.85, 4.72, 0.6, 0.25, 9);
  slide.addShape('roundRect', {
    x: 1.05, y: 5.02, w: 5.4, h: 0.08,
    radius: 0.04, fill: { color: 'E2E8F0' }, line: { color: 'E2E8F0', transparency: 100 },
  });
  slide.addShape('roundRect', {
    x: 1.05, y: 5.02, w: 3.8, h: 0.08,
    radius: 0.04, fill: { color: COLORS.green, transparency: 35 }, line: { color: COLORS.green, transparency: 100 },
  });

  slide.addText('2', {
    x: 7.78, y: 2.32, w: 0.34, h: 0.34,
    fontFace: 'Newsreader', fontSize: 16, color: COLORS.amber, align: 'center', valign: 'mid',
    shape: 'ellipse', fill: { color: 'FFFFFF' }, line: { color: 'E5E7EB', pt: 1 }, margin: 0,
  });
  slide.addText('Risk Engine', {
    x: 8.35, y: 2.28, w: 1.15, h: 0.3,
    fontFace: 'Newsreader', fontSize: 15, color: COLORS.text, margin: 0,
  });
  addBody(slide, 'Зеркализация приоритетов по воспитанию и реакции на истерику. Избегаем базовых конфликтов.', 7.8, 2.85, 1.75, 1.0, 9.5);

  slide.addText('3', {
    x: 10.4, y: 2.32, w: 0.34, h: 0.34,
    fontFace: 'Newsreader', fontSize: 16, color: COLORS.purple, align: 'center', valign: 'mid',
    shape: 'ellipse', fill: { color: 'FFFFFF' }, line: { color: 'E5E7EB', pt: 1 }, margin: 0,
  });
  slide.addText('AI "The Why"', {
    x: 10.96, y: 2.28, w: 1.2, h: 0.3,
    fontFace: 'Newsreader', fontSize: 15, color: COLORS.text, margin: 0,
  });
  addBody(slide, 'Gemini переводит сухой score в понятное объяснение fit: "подходит вам по режиму и ожиданиям к коммуникации".', 10.42, 2.85, 1.75, 1.08, 9.5);
}

function buildSlide3(pptx) {
  const slide = pptx.addSlide();
  addBackground(slide);

  addPill(slide, 'Архитектурный мост', {
    x: 5.25, y: 0.58, w: 1.9,
    fill: COLORS.amberBg, line: COLORS.amberBorder, textColor: 'B45309',
  });
  slide.addText('Машина Сбора Данных', {
    x: 3.55, y: 1.05, w: 6.2, h: 0.55,
    fontFace: 'Newsreader', fontSize: 24, color: COLORS.text, align: 'center', margin: 0,
  });
  addBody(
    slide,
    'Приложение не только помогает выбрать сейчас, но и создает обучающий контур из реальных сигналов успешного долгосрочного матча.',
    2.45, 1.72, 8.45, 0.7, 12
  );

  const cards = [
    {
      x: 0.9, title: 'Shadow Scoring',
      body: 'Сохраняем сырые оценки и сигналы до фильтрации, чтобы понять, что действительно влияет на качество матча.',
    },
    {
      x: 4.65, title: 'Controlled Exploration',
      body: 'Небольшая примесь неочевидных кандидатов помогает системе учиться за пределами уже известных правил.',
    },
    {
      x: 8.4, title: 'Retention Loop',
      body: 'Истинная награда не клик и не чат, а устойчивый fit: вышла ли пара в повторяемое доверие через недели и месяцы.',
    },
  ];

  cards.forEach((card) => {
    addCard(slide, { x: card.x, y: 3.05, w: 3.05, h: 2.45 });
    slide.addShape('ellipse', {
      x: card.x + 1.22, y: 3.38, w: 0.58, h: 0.58,
      line: { color: 'CBD5E1', pt: 1.2 },
      fill: { color: 'FFFFFF', transparency: 100 },
    });
    slide.addText(card.title, {
      x: card.x + 0.35, y: 4.15, w: 2.35, h: 0.25,
      fontFace: 'Newsreader', fontSize: 14, color: COLORS.text, align: 'center', margin: 0,
    });
    addBody(slide, card.body, card.x + 0.32, 4.55, 2.42, 0.9, 9.5);
  });

  slide.addShape('chevron', {
    x: 3.95, y: 4.08, w: 0.42, h: 0.18,
    line: { color: COLORS.slate, transparency: 100 },
    fill: { color: COLORS.slate },
  });
  slide.addShape('chevron', {
    x: 7.7, y: 4.08, w: 0.42, h: 0.18,
    line: { color: COLORS.slate, transparency: 100 },
    fill: { color: COLORS.slate },
  });
}

function buildSlide4(pptx) {
  const slide = pptx.addSlide();
  addBackground(slide);

  addCard(slide, { x: 0.85, y: 1.0, w: 5.5, h: 5.15 });
  slide.addText('Heuristics vs ML', {
    x: 1.2, y: 1.35, w: 2.4, h: 0.3,
    fontFace: 'Newsreader', fontSize: 16, color: COLORS.text, margin: 0,
  });
  slide.addShape('line', {
    x: 1.1, y: 2.25, w: 4.8, h: 0,
    line: { color: 'F1F5F9', pt: 1 },
  });
  slide.addShape('line', {
    x: 1.1, y: 3.05, w: 4.8, h: 0,
    line: { color: 'F1F5F9', pt: 1 },
  });
  slide.addShape('line', {
    x: 1.1, y: 3.85, w: 4.8, h: 0,
    line: { color: 'F1F5F9', pt: 1 },
  });
  slide.addShape('line', {
    x: 1.1, y: 3.55, w: 4.7, h: 0,
    line: { color: COLORS.slate, pt: 1.2, dash: 'dash' },
  });
  slide.addText('Rule-Based Limit', {
    x: 4.5, y: 3.18, w: 1.2, h: 0.22,
    fontFace: 'Manrope', fontSize: 9, color: '64748B', margin: 0,
  });
  slide.addShape('line', {
    x: 1.15, y: 4.55, w: 4.45, h: -3.05,
    line: { color: COLORS.accent, pt: 2.5, beginArrowType: 'none', endArrowType: 'none' },
  });
  slide.addText('ML Prediction', {
    x: 4.78, y: 1.72, w: 0.9, h: 0.22,
    fontFace: 'Manrope', fontSize: 10, bold: true, color: '0284C7', margin: 0,
  });

  addPill(slide, 'Phase II: Целевая Архитектура', {
    x: 7.15, y: 0.98, w: 2.45,
    fill: COLORS.roseBg, line: COLORS.roseBorder, textColor: 'BE123C',
  });
  addTitle(slide, 'Контекстные Бандиты & Вектора', 7.1, 1.48, 5.2);
  addBody(
    slide,
    'Настоящий moat появляется не в момент запуска модели, а в момент накопления качественных исходов. Тогда подбор превращается из сравнения анкет в прогноз долгосрочного успешного fit.',
    7.12, 2.48, 5.1, 1.15, 12
  );
  addBulletList(slide, [
    'Поиск скрытых паттернов: семантика отзывов, повторяемые trust-сигналы, неочевидные корреляции между ожиданиями семьи и стилем няни.',
    'Переход от оптимизации "открытых чатов" к оптимизации "стабильных долгих отношений без срывов".',
  ], 7.18, 4.02, 4.85);
}

async function main() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Codex';
  pptx.company = 'Blizko';
  pptx.subject = 'Matching Evolution';
  pptx.title = 'Blizko: Matching Evolution';
  pptx.lang = 'ru-RU';
  pptx.theme = {
    headFontFace: 'Newsreader',
    bodyFontFace: 'Manrope',
    lang: 'ru-RU',
  };

  buildSlide1(pptx);
  buildSlide2(pptx);
  buildSlide3(pptx);
  buildSlide4(pptx);

  await pptx.writeFile({ fileName: outputPptxPath });
  console.log(JSON.stringify({ outputPptxPath, slides: 4 }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

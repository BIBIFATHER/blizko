// Blizko Cloud Design System — Figma Plugin (v2 — fixed)
// Plugins → Development → Blizko Design System Generator → Run

// ============ COLORS ============
const colors = {
    'bg': { r: 249 / 255, g: 246 / 255, b: 241 / 255 },
    'honey': { r: 232 / 255, g: 213 / 255, b: 163 / 255 },
    'honey-light': { r: 242 / 255, g: 230 / 255, b: 197 / 255 },
    'text': { r: 68 / 255, g: 64 / 255, b: 60 / 255 },
    'text-muted': { r: 168 / 255, g: 162 / 255, b: 158 / 255 },
    'brand': { r: 93 / 255, g: 78 / 255, b: 55 / 255 },
    'white': { r: 1, g: 1, b: 1 },
    'green': { r: 22 / 255, g: 163 / 255, b: 74 / 255 },
    'blue': { r: 8 / 255, g: 145 / 255, b: 178 / 255 },
    'warning': { r: 202 / 255, g: 138 / 255, b: 4 / 255 },
    'error': { r: 220 / 255, g: 38 / 255, b: 38 / 255 },
    'info': { r: 99 / 255, g: 102 / 255, b: 241 / 255 },
};

const badgeBgs = {
    'green-bg': { r: 240 / 255, g: 253 / 255, b: 244 / 255 },
    'amber-bg': { r: 255 / 255, g: 251 / 255, b: 235 / 255 },
    'red-bg': { r: 254 / 255, g: 242 / 255, b: 242 / 255 },
    'blue-bg': { r: 236 / 255, g: 254 / 255, b: 255 / 255 },
    'indigo-bg': { r: 238 / 255, g: 238 / 255, b: 252 / 255 },
};

async function main() {
    const page = figma.currentPage;

    // Load only Inter (guaranteed available in Figma)
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

    let yOffset = 0;

    // ===== 1. COLOR SWATCHES =====
    const colorSection = figma.createFrame();
    colorSection.name = '🎨 Colors';
    colorSection.layoutMode = 'VERTICAL';
    colorSection.itemSpacing = 16;
    colorSection.paddingLeft = 32;
    colorSection.paddingRight = 32;
    colorSection.paddingTop = 32;
    colorSection.paddingBottom = 32;
    colorSection.primaryAxisSizingMode = 'AUTO';
    colorSection.counterAxisSizingMode = 'AUTO';
    colorSection.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    // Title
    const colorTitle = figma.createText();
    colorTitle.fontName = { family: 'Inter', style: 'Bold' };
    colorTitle.characters = 'Cloud Design System — Colors';
    colorTitle.fontSize = 24;
    colorTitle.fills = [{ type: 'SOLID', color: colors['text'] }];
    colorSection.appendChild(colorTitle);

    // Color row
    const colorRow = figma.createFrame();
    colorRow.name = 'color-row';
    colorRow.layoutMode = 'HORIZONTAL';
    colorRow.itemSpacing = 12;
    colorRow.primaryAxisSizingMode = 'AUTO';
    colorRow.counterAxisSizingMode = 'AUTO';

    for (const [name, color] of Object.entries(colors)) {
        const swatch = figma.createFrame();
        swatch.name = name;
        swatch.layoutMode = 'VERTICAL';
        swatch.itemSpacing = 6;
        swatch.primaryAxisSizingMode = 'AUTO';
        swatch.counterAxisSizingMode = 'AUTO';
        swatch.counterAxisAlignItems = 'CENTER';

        const rect = figma.createRectangle();
        rect.resize(72, 52);
        rect.fills = [{ type: 'SOLID', color: color }];
        rect.cornerRadius = 8;
        swatch.appendChild(rect);

        const label = figma.createText();
        label.fontName = { family: 'Inter', style: 'Regular' };
        label.characters = name;
        label.fontSize = 10;
        label.fills = [{ type: 'SOLID', color: colors['text-muted'] }];
        swatch.appendChild(label);

        colorRow.appendChild(swatch);
    }
    colorSection.appendChild(colorRow);

    // Badge BG row
    const badgeTitle = figma.createText();
    badgeTitle.fontName = { family: 'Inter', style: 'Semi Bold' };
    badgeTitle.characters = 'Badge Backgrounds';
    badgeTitle.fontSize = 14;
    badgeTitle.fills = [{ type: 'SOLID', color: colors['text'] }];
    colorSection.appendChild(badgeTitle);

    const badgeRow = figma.createFrame();
    badgeRow.name = 'badge-bg-row';
    badgeRow.layoutMode = 'HORIZONTAL';
    badgeRow.itemSpacing = 12;
    badgeRow.primaryAxisSizingMode = 'AUTO';
    badgeRow.counterAxisSizingMode = 'AUTO';

    for (const [name, color] of Object.entries(badgeBgs)) {
        const swatch = figma.createFrame();
        swatch.name = name;
        swatch.layoutMode = 'VERTICAL';
        swatch.itemSpacing = 6;
        swatch.primaryAxisSizingMode = 'AUTO';
        swatch.counterAxisSizingMode = 'AUTO';
        swatch.counterAxisAlignItems = 'CENTER';

        const rect = figma.createRectangle();
        rect.resize(72, 52);
        rect.fills = [{ type: 'SOLID', color: color }];
        rect.cornerRadius = 8;
        rect.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
        rect.strokeWeight = 1;
        swatch.appendChild(rect);

        const label = figma.createText();
        label.fontName = { family: 'Inter', style: 'Regular' };
        label.characters = name;
        label.fontSize = 10;
        label.fills = [{ type: 'SOLID', color: colors['text-muted'] }];
        swatch.appendChild(label);

        badgeRow.appendChild(swatch);
    }
    colorSection.appendChild(badgeRow);

    page.appendChild(colorSection);
    colorSection.x = 0;
    colorSection.y = yOffset;
    yOffset += colorSection.height + 60;

    // ===== 2. TYPOGRAPHY =====
    const typoSection = figma.createFrame();
    typoSection.name = '📝 Typography';
    typoSection.layoutMode = 'VERTICAL';
    typoSection.itemSpacing = 20;
    typoSection.paddingLeft = 32;
    typoSection.paddingRight = 32;
    typoSection.paddingTop = 32;
    typoSection.paddingBottom = 32;
    typoSection.primaryAxisSizingMode = 'AUTO';
    typoSection.counterAxisSizingMode = 'AUTO';
    typoSection.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    const typoTitle = figma.createText();
    typoTitle.fontName = { family: 'Inter', style: 'Bold' };
    typoTitle.characters = 'Typography Scale';
    typoTitle.fontSize = 24;
    typoTitle.fills = [{ type: 'SOLID', color: colors['text'] }];
    typoSection.appendChild(typoTitle);

    const typoDefs = [
        { name: 'H1', style: 'Bold', size: 40, lh: 48, sample: 'Blizko — подбор нянь' },
        { name: 'H2', style: 'Bold', size: 32, lh: 40, sample: 'Как мы проверяем нянь' },
        { name: 'H3', style: 'Bold', size: 24, lh: 32, sample: 'Гарантия прихода' },
        { name: 'Body', style: 'Regular', size: 16, lh: 24, sample: 'Мы подбираем проверенных нянь с помощью AI.' },
        { name: 'Body Semi', style: 'Semi Bold', size: 16, lh: 24, sample: 'Совместимость 97%' },
        { name: 'Small', style: 'Regular', size: 14, lh: 20, sample: 'Подтверждение за 24 часа до выхода' },
        { name: 'Caption', style: 'Regular', size: 12, lh: 16, sample: 'Обновлено 5 мин назад' },
    ];

    for (const t of typoDefs) {
        const row = figma.createFrame();
        row.name = t.name;
        row.layoutMode = 'VERTICAL';
        row.itemSpacing = 4;
        row.primaryAxisSizingMode = 'AUTO';
        row.counterAxisSizingMode = 'AUTO';

        const sample = figma.createText();
        sample.fontName = { family: 'Inter', style: t.style };
        sample.characters = t.sample;
        sample.fontSize = t.size;
        sample.lineHeight = { value: t.lh, unit: 'PIXELS' };
        sample.fills = [{ type: 'SOLID', color: colors['text'] }];
        row.appendChild(sample);

        const meta = figma.createText();
        meta.fontName = { family: 'Inter', style: 'Regular' };
        meta.characters = `${t.name} · Inter ${t.style} · ${t.size}px / ${t.lh}px`;
        meta.fontSize = 11;
        meta.fills = [{ type: 'SOLID', color: colors['text-muted'] }];
        row.appendChild(meta);

        typoSection.appendChild(row);
    }

    page.appendChild(typoSection);
    typoSection.x = 0;
    typoSection.y = yOffset;
    yOffset += typoSection.height + 60;

    // ===== 3. BUTTONS =====
    const btnSection = figma.createFrame();
    btnSection.name = '🔘 Buttons';
    btnSection.layoutMode = 'VERTICAL';
    btnSection.itemSpacing = 16;
    btnSection.paddingLeft = 32;
    btnSection.paddingRight = 32;
    btnSection.paddingTop = 32;
    btnSection.paddingBottom = 32;
    btnSection.primaryAxisSizingMode = 'AUTO';
    btnSection.counterAxisSizingMode = 'AUTO';
    btnSection.fills = [{ type: 'SOLID', color: colors['bg'] }];

    const btnTitle = figma.createText();
    btnTitle.fontName = { family: 'Inter', style: 'Bold' };
    btnTitle.characters = 'Buttons';
    btnTitle.fontSize = 24;
    btnTitle.fills = [{ type: 'SOLID', color: colors['text'] }];
    btnSection.appendChild(btnTitle);

    const btnRow = figma.createFrame();
    btnRow.name = 'buttons-row';
    btnRow.layoutMode = 'HORIZONTAL';
    btnRow.itemSpacing = 16;
    btnRow.primaryAxisSizingMode = 'AUTO';
    btnRow.counterAxisSizingMode = 'AUTO';

    const btnDefs = [
        { name: 'Primary', bg: colors['honey'], text: colors['brand'], label: 'Найти няню ✨' },
        { name: 'Secondary', bg: { r: 0.96, g: 0.96, b: 0.96 }, text: colors['text'], label: 'Подробнее' },
        { name: 'Danger', bg: badgeBgs['red-bg'], text: colors['error'], label: 'Удалить' },
        { name: 'Success', bg: badgeBgs['green-bg'], text: colors['green'], label: 'Подтвердить ✓' },
    ];

    for (const def of btnDefs) {
        const btn = figma.createFrame();
        btn.name = 'Btn/' + def.name;
        btn.layoutMode = 'HORIZONTAL';
        btn.primaryAxisAlignItems = 'CENTER';
        btn.counterAxisAlignItems = 'CENTER';
        btn.paddingLeft = 32;
        btn.paddingRight = 32;
        btn.paddingTop = 14;
        btn.paddingBottom = 14;
        btn.cornerRadius = 999;
        btn.fills = [{ type: 'SOLID', color: def.bg }];

        const label = figma.createText();
        label.fontName = { family: 'Inter', style: 'Semi Bold' };
        label.characters = def.label;
        label.fontSize = 16;
        label.fills = [{ type: 'SOLID', color: def.text }];
        btn.appendChild(label);

        btnRow.appendChild(btn);
    }
    btnSection.appendChild(btnRow);

    page.appendChild(btnSection);
    btnSection.x = 0;
    btnSection.y = yOffset;
    yOffset += btnSection.height + 60;

    // ===== 4. BADGES =====
    const badgeSection = figma.createFrame();
    badgeSection.name = '🏷️ Badges';
    badgeSection.layoutMode = 'VERTICAL';
    badgeSection.itemSpacing = 16;
    badgeSection.paddingLeft = 32;
    badgeSection.paddingRight = 32;
    badgeSection.paddingTop = 32;
    badgeSection.paddingBottom = 32;
    badgeSection.primaryAxisSizingMode = 'AUTO';
    badgeSection.counterAxisSizingMode = 'AUTO';
    badgeSection.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    const badgeSectionTitle = figma.createText();
    badgeSectionTitle.fontName = { family: 'Inter', style: 'Bold' };
    badgeSectionTitle.characters = 'Badges';
    badgeSectionTitle.fontSize = 24;
    badgeSectionTitle.fills = [{ type: 'SOLID', color: colors['text'] }];
    badgeSection.appendChild(badgeSectionTitle);

    const badgeSectionRow = figma.createFrame();
    badgeSectionRow.name = 'badges-row';
    badgeSectionRow.layoutMode = 'HORIZONTAL';
    badgeSectionRow.itemSpacing = 12;
    badgeSectionRow.primaryAxisSizingMode = 'AUTO';
    badgeSectionRow.counterAxisSizingMode = 'AUTO';

    const badgeDefs = [
        { bg: badgeBgs['green-bg'], text: colors['green'], label: '✓ Verified' },
        { bg: badgeBgs['amber-bg'], text: colors['warning'], label: '⏳ Pending' },
        { bg: badgeBgs['red-bg'], text: colors['error'], label: '✕ Rejected' },
        { bg: badgeBgs['indigo-bg'], text: colors['info'], label: 'ℹ Info' },
        { bg: badgeBgs['blue-bg'], text: colors['blue'], label: '🛡 Trusted' },
    ];

    for (const def of badgeDefs) {
        const badge = figma.createFrame();
        badge.name = 'Badge';
        badge.layoutMode = 'HORIZONTAL';
        badge.primaryAxisAlignItems = 'CENTER';
        badge.counterAxisAlignItems = 'CENTER';
        badge.paddingLeft = 12;
        badge.paddingRight = 12;
        badge.paddingTop = 6;
        badge.paddingBottom = 6;
        badge.cornerRadius = 999;
        badge.fills = [{ type: 'SOLID', color: def.bg }];

        const label = figma.createText();
        label.fontName = { family: 'Inter', style: 'Semi Bold' };
        label.characters = def.label;
        label.fontSize = 12;
        label.fills = [{ type: 'SOLID', color: def.text }];
        badge.appendChild(label);

        badgeSectionRow.appendChild(badge);
    }
    badgeSection.appendChild(badgeSectionRow);

    page.appendChild(badgeSection);
    badgeSection.x = 0;
    badgeSection.y = yOffset;
    yOffset += badgeSection.height + 60;

    // ===== 5. CARD =====
    const card = figma.createFrame();
    card.name = '🃏 Card Example';
    card.layoutMode = 'VERTICAL';
    card.itemSpacing = 12;
    card.paddingLeft = 24;
    card.paddingRight = 24;
    card.paddingTop = 24;
    card.paddingBottom = 24;
    card.cornerRadius = 24;
    card.primaryAxisSizingMode = 'AUTO';
    card.resize(360, 10);
    card.counterAxisSizingMode = 'FIXED';
    card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    card.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0.47, g: 0.44, b: 0.42, a: 0.06 },
        offset: { x: 0, y: 8 },
        radius: 32,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL',
    }];

    const cardTitle = figma.createText();
    cardTitle.fontName = { family: 'Inter', style: 'Bold' };
    cardTitle.characters = 'Анна — проверенная няня';
    cardTitle.fontSize = 18;
    cardTitle.fills = [{ type: 'SOLID', color: colors['text'] }];
    card.appendChild(cardTitle);

    const cardBody = figma.createText();
    cardBody.fontName = { family: 'Inter', style: 'Regular' };
    cardBody.characters = 'Опыт 5 лет · Педагогическое образование · Совместимость 97%';
    cardBody.fontSize = 14;
    cardBody.lineHeight = { value: 20, unit: 'PIXELS' };
    cardBody.fills = [{ type: 'SOLID', color: colors['text-muted'] }];
    card.appendChild(cardBody);

    // Card CTA
    const cardBtn = figma.createFrame();
    cardBtn.name = 'Card CTA';
    cardBtn.layoutMode = 'HORIZONTAL';
    cardBtn.primaryAxisAlignItems = 'CENTER';
    cardBtn.counterAxisAlignItems = 'CENTER';
    cardBtn.paddingLeft = 24;
    cardBtn.paddingRight = 24;
    cardBtn.paddingTop = 12;
    cardBtn.paddingBottom = 12;
    cardBtn.cornerRadius = 999;
    cardBtn.fills = [{ type: 'SOLID', color: colors['honey'] }];
    cardBtn.primaryAxisSizingMode = 'AUTO';
    cardBtn.counterAxisSizingMode = 'AUTO';

    const cardBtnLabel = figma.createText();
    cardBtnLabel.fontName = { family: 'Inter', style: 'Semi Bold' };
    cardBtnLabel.characters = 'Написать';
    cardBtnLabel.fontSize = 14;
    cardBtnLabel.fills = [{ type: 'SOLID', color: colors['brand'] }];
    cardBtn.appendChild(cardBtnLabel);
    card.appendChild(cardBtn);

    page.appendChild(card);
    card.x = 0;
    card.y = yOffset;
    yOffset += card.height + 60;

    // ===== 6. SPACING =====
    const spaceSection = figma.createFrame();
    spaceSection.name = '📏 Spacing';
    spaceSection.layoutMode = 'VERTICAL';
    spaceSection.itemSpacing = 16;
    spaceSection.paddingLeft = 32;
    spaceSection.paddingRight = 32;
    spaceSection.paddingTop = 32;
    spaceSection.paddingBottom = 32;
    spaceSection.primaryAxisSizingMode = 'AUTO';
    spaceSection.counterAxisSizingMode = 'AUTO';
    spaceSection.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    const spaceTitle = figma.createText();
    spaceTitle.fontName = { family: 'Inter', style: 'Bold' };
    spaceTitle.characters = 'Spacing Scale';
    spaceTitle.fontSize = 24;
    spaceTitle.fills = [{ type: 'SOLID', color: colors['text'] }];
    spaceSection.appendChild(spaceTitle);

    const spaceRow = figma.createFrame();
    spaceRow.name = 'spacing-row';
    spaceRow.layoutMode = 'HORIZONTAL';
    spaceRow.itemSpacing = 20;
    spaceRow.counterAxisAlignItems = 'MAX';
    spaceRow.primaryAxisSizingMode = 'AUTO';
    spaceRow.counterAxisSizingMode = 'AUTO';

    const spacings = [
        { name: 'xs', value: 4 },
        { name: 'sm', value: 8 },
        { name: 'md', value: 16 },
        { name: 'lg', value: 24 },
        { name: 'xl', value: 32 },
        { name: '2xl', value: 48 },
    ];

    for (const sp of spacings) {
        const block = figma.createFrame();
        block.name = sp.name;
        block.layoutMode = 'VERTICAL';
        block.itemSpacing = 6;
        block.primaryAxisSizingMode = 'AUTO';
        block.counterAxisSizingMode = 'AUTO';
        block.counterAxisAlignItems = 'CENTER';

        const rect = figma.createRectangle();
        rect.resize(Math.max(sp.value, 8), Math.max(sp.value, 8));
        rect.fills = [{ type: 'SOLID', color: colors['honey'] }];
        rect.cornerRadius = 4;
        block.appendChild(rect);

        const label = figma.createText();
        label.fontName = { family: 'Inter', style: 'Regular' };
        label.characters = sp.name + ' · ' + sp.value + 'px';
        label.fontSize = 10;
        label.fills = [{ type: 'SOLID', color: colors['text-muted'] }];
        block.appendChild(label);

        spaceRow.appendChild(block);
    }
    spaceSection.appendChild(spaceRow);

    page.appendChild(spaceSection);
    spaceSection.x = 0;
    spaceSection.y = yOffset;

    // Zoom to fit
    figma.viewport.scrollAndZoomIntoView(page.children);

    figma.closePlugin('✅ Blizko Design System создана! 🎨 Цвета · 📝 Типографика · 🔘 Кнопки · 🏷️ Бейджи · 🃏 Карточка · 📏 Spacing');
}

main();

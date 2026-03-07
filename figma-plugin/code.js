// Blizko Cloud Design System — Figma Plugin
// Запустите в Figma: Plugins → Development → Import plugin from manifest

// ============ COLORS ============
const colors = {
    'cloud/bg': { r: 249 / 255, g: 246 / 255, b: 241 / 255 },
    'cloud/honey-solid': { r: 232 / 255, g: 213 / 255, b: 163 / 255 },
    'cloud/honey-light': { r: 242 / 255, g: 230 / 255, b: 197 / 255 },
    'cloud/text': { r: 68 / 255, g: 64 / 255, b: 60 / 255 },
    'cloud/text-muted': { r: 168 / 255, g: 162 / 255, b: 158 / 255 },
    'cloud/brand': { r: 93 / 255, g: 78 / 255, b: 55 / 255 },
    'cloud/surface': { r: 255 / 255, g: 255 / 255, b: 255 / 255 },
    'trust/green': { r: 22 / 255, g: 163 / 255, b: 74 / 255 },
    'trust/blue': { r: 8 / 255, g: 145 / 255, b: 178 / 255 },
    'status/warning': { r: 202 / 255, g: 138 / 255, b: 4 / 255 },
    'status/error': { r: 220 / 255, g: 38 / 255, b: 38 / 255 },
    'status/info': { r: 99 / 255, g: 102 / 255, b: 241 / 255 },
    'badge/green-bg': { r: 240 / 255, g: 253 / 255, b: 244 / 255 },
    'badge/amber-bg': { r: 255 / 255, g: 251 / 255, b: 235 / 255 },
    'badge/red-bg': { r: 254 / 255, g: 242 / 255, b: 242 / 255 },
    'badge/blue-bg': { r: 236 / 255, g: 254 / 255, b: 255 / 255 },
    'badge/indigo-bg': { r: 238 / 255, g: 238 / 255, b: 252 / 255 },
};

// ============ TYPOGRAPHY ============
const fonts = [
    { name: 'H1 / Playfair', family: 'Playfair Display', style: 'Bold', size: 40, lineHeight: 48 },
    { name: 'H2 / Quicksand', family: 'Quicksand', style: 'Bold', size: 32, lineHeight: 40 },
    { name: 'H3 / Nunito', family: 'Nunito', style: 'Bold', size: 24, lineHeight: 32 },
    { name: 'Body / Inter', family: 'Inter', style: 'Regular', size: 16, lineHeight: 24 },
    { name: 'Body Semi / Inter', family: 'Inter', style: 'Semi Bold', size: 16, lineHeight: 24 },
    { name: 'Small / Inter', family: 'Inter', style: 'Regular', size: 14, lineHeight: 20 },
    { name: 'Caption / Inter', family: 'Inter', style: 'Regular', size: 12, lineHeight: 16 },
    { name: 'Button / Inter', family: 'Inter', style: 'Semi Bold', size: 16, lineHeight: 24 },
];

// ============ SPACING ============
const spacings = [
    { name: 'xs', value: 4 },
    { name: 'sm', value: 8 },
    { name: 'md', value: 16 },
    { name: 'lg', value: 24 },
    { name: 'xl', value: 32 },
    { name: '2xl', value: 48 },
];

// ============ RADII ============
const radii = [
    { name: 'card', value: 24 },
    { name: 'btn', value: 9999 },
    { name: 'input', value: 16 },
    { name: 'badge', value: 9999 },
];

// ============ HELPERS ============
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
}

// ============ MAIN ============
async function main() {
    const page = figma.currentPage;

    // Load fonts
    const fontFamilies = [...new Set(fonts.map(f => f.family))];
    for (const f of fonts) {
        try {
            await figma.loadFontAsync({ family: f.family, style: f.style });
        } catch {
            console.log(`⚠️ Font ${f.family} ${f.style} not available, using Inter Regular`);
            await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
        }
    }

    // ===== Create Color Swatches =====
    const colorFrame = figma.createFrame();
    colorFrame.name = '🎨 Colors';
    colorFrame.layoutMode = 'HORIZONTAL';
    colorFrame.layoutWrap = 'WRAP';
    colorFrame.itemSpacing = 16;
    colorFrame.counterAxisSpacing = 16;
    colorFrame.paddingLeft = 32;
    colorFrame.paddingRight = 32;
    colorFrame.paddingTop = 32;
    colorFrame.paddingBottom = 32;
    colorFrame.primaryAxisSizingMode = 'FIXED';
    colorFrame.resize(800, colorFrame.height);
    colorFrame.counterAxisSizingMode = 'AUTO';
    colorFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    for (const [name, color] of Object.entries(colors)) {
        const swatch = figma.createFrame();
        swatch.name = name;
        swatch.resize(100, 120);
        swatch.layoutMode = 'VERTICAL';
        swatch.itemSpacing = 8;
        swatch.paddingBottom = 8;
        swatch.cornerRadius = 12;
        swatch.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97 } }];
        swatch.clipsContent = true;

        const rect = figma.createRectangle();
        rect.resize(100, 70);
        rect.fills = [{ type: 'SOLID', color }];
        swatch.appendChild(rect);

        const label = figma.createText();
        try {
            label.fontName = { family: 'Inter', style: 'Regular' };
        } catch {
            // fallback
        }
        label.characters = name.split('/').pop() || name;
        label.fontSize = 10;
        label.fills = [{ type: 'SOLID', color: { r: 0.27, g: 0.25, b: 0.24 } }];
        label.layoutAlign = 'STRETCH';
        label.textAlignHorizontal = 'CENTER';
        swatch.appendChild(label);

        colorFrame.appendChild(swatch);
    }

    page.appendChild(colorFrame);
    colorFrame.x = 0;
    colorFrame.y = 0;

    // ===== Create Typography Samples =====
    const typoFrame = figma.createFrame();
    typoFrame.name = '📝 Typography';
    typoFrame.layoutMode = 'VERTICAL';
    typoFrame.itemSpacing = 24;
    typoFrame.paddingLeft = 32;
    typoFrame.paddingRight = 32;
    typoFrame.paddingTop = 32;
    typoFrame.paddingBottom = 32;
    typoFrame.resize(600, 100);
    typoFrame.primaryAxisSizingMode = 'AUTO';
    typoFrame.counterAxisSizingMode = 'FIXED';
    typoFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    for (const f of fonts) {
        const row = figma.createFrame();
        row.name = f.name;
        row.layoutMode = 'VERTICAL';
        row.itemSpacing = 4;
        row.counterAxisSizingMode = 'AUTO';
        row.primaryAxisSizingMode = 'AUTO';

        const sample = figma.createText();
        try {
            sample.fontName = { family: f.family, style: f.style };
        } catch {
            sample.fontName = { family: 'Inter', style: 'Regular' };
        }
        sample.characters = `${f.name} — Blizko помогает семьям`;
        sample.fontSize = f.size;
        sample.lineHeight = { value: f.lineHeight, unit: 'PIXELS' };
        sample.fills = [{ type: 'SOLID', color: colors['cloud/text'] }];
        row.appendChild(sample);

        const meta = figma.createText();
        meta.fontName = { family: 'Inter', style: 'Regular' };
        meta.characters = `${f.family} ${f.style} • ${f.size}px / ${f.lineHeight}px`;
        meta.fontSize = 11;
        meta.fills = [{ type: 'SOLID', color: colors['cloud/text-muted'] }];
        row.appendChild(meta);

        typoFrame.appendChild(row);
    }

    page.appendChild(typoFrame);
    typoFrame.x = 0;
    typoFrame.y = colorFrame.height + 60;

    // ===== Create Button Components =====
    const btnFrame = figma.createFrame();
    btnFrame.name = '🔘 Buttons';
    btnFrame.layoutMode = 'HORIZONTAL';
    btnFrame.itemSpacing = 24;
    btnFrame.paddingLeft = 32;
    btnFrame.paddingRight = 32;
    btnFrame.paddingTop = 32;
    btnFrame.paddingBottom = 32;
    btnFrame.counterAxisSizingMode = 'AUTO';
    btnFrame.primaryAxisSizingMode = 'AUTO';
    btnFrame.fills = [{ type: 'SOLID', color: colors['cloud/bg'] }];

    const buttonDefs = [
        { name: 'Button / Primary', bg: colors['cloud/honey-solid'], text: colors['cloud/brand'], textStr: 'Найти няню ✨' },
        { name: 'Button / Secondary', bg: { r: 0.96, g: 0.96, b: 0.96 }, text: colors['cloud/text'], textStr: 'Подробнее' },
        { name: 'Button / Danger', bg: colors['badge/red-bg'], text: colors['status/error'], textStr: 'Удалить' },
        { name: 'Button / Success', bg: colors['badge/green-bg'], text: colors['trust/green'], textStr: 'Подтвердить' },
    ];

    for (const def of buttonDefs) {
        const btn = figma.createFrame();
        btn.name = def.name;
        btn.layoutMode = 'HORIZONTAL';
        btn.primaryAxisAlignItems = 'CENTER';
        btn.counterAxisAlignItems = 'CENTER';
        btn.paddingLeft = 32;
        btn.paddingRight = 32;
        btn.paddingTop = 14;
        btn.paddingBottom = 14;
        btn.cornerRadius = 9999;
        btn.fills = [{ type: 'SOLID', color: def.bg }];

        const label = figma.createText();
        try {
            label.fontName = { family: 'Inter', style: 'Semi Bold' };
        } catch {
            label.fontName = { family: 'Inter', style: 'Regular' };
        }
        label.characters = def.textStr;
        label.fontSize = 16;
        label.fills = [{ type: 'SOLID', color: def.text }];
        btn.appendChild(label);

        btnFrame.appendChild(btn);
    }

    page.appendChild(btnFrame);
    btnFrame.x = 0;
    btnFrame.y = typoFrame.y + typoFrame.height + 60;

    // ===== Create Badge Components =====
    const badgeFrame = figma.createFrame();
    badgeFrame.name = '🏷️ Badges';
    badgeFrame.layoutMode = 'HORIZONTAL';
    badgeFrame.itemSpacing = 12;
    badgeFrame.paddingLeft = 32;
    badgeFrame.paddingRight = 32;
    badgeFrame.paddingTop = 32;
    badgeFrame.paddingBottom = 32;
    badgeFrame.counterAxisSizingMode = 'AUTO';
    badgeFrame.primaryAxisSizingMode = 'AUTO';
    badgeFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    const badgeDefs = [
        { name: 'Badge / Success', bg: colors['badge/green-bg'], text: colors['trust/green'], label: '✓ Verified' },
        { name: 'Badge / Warning', bg: colors['badge/amber-bg'], text: colors['status/warning'], label: '⏳ Pending' },
        { name: 'Badge / Danger', bg: colors['badge/red-bg'], text: colors['status/error'], label: '✕ Rejected' },
        { name: 'Badge / Info', bg: colors['badge/indigo-bg'], text: colors['status/info'], label: 'ℹ Info' },
        { name: 'Badge / Trust', bg: colors['badge/blue-bg'], text: colors['trust/blue'], label: '🛡 Trusted' },
    ];

    for (const def of badgeDefs) {
        const badge = figma.createFrame();
        badge.name = def.name;
        badge.layoutMode = 'HORIZONTAL';
        badge.primaryAxisAlignItems = 'CENTER';
        badge.counterAxisAlignItems = 'CENTER';
        badge.paddingLeft = 12;
        badge.paddingRight = 12;
        badge.paddingTop = 4;
        badge.paddingBottom = 4;
        badge.cornerRadius = 9999;
        badge.fills = [{ type: 'SOLID', color: def.bg }];

        const label = figma.createText();
        try {
            label.fontName = { family: 'Inter', style: 'Semi Bold' };
        } catch {
            label.fontName = { family: 'Inter', style: 'Regular' };
        }
        label.characters = def.label;
        label.fontSize = 12;
        label.fills = [{ type: 'SOLID', color: def.text }];
        badge.appendChild(label);

        badgeFrame.appendChild(badge);
    }

    page.appendChild(badgeFrame);
    badgeFrame.x = 0;
    badgeFrame.y = btnFrame.y + btnFrame.height + 60;

    // ===== Create Card Component =====
    const cardFrame = figma.createFrame();
    cardFrame.name = '🃏 Card';
    cardFrame.layoutMode = 'VERTICAL';
    cardFrame.itemSpacing = 12;
    cardFrame.paddingLeft = 20;
    cardFrame.paddingRight = 20;
    cardFrame.paddingTop = 20;
    cardFrame.paddingBottom = 20;
    cardFrame.resize(340, 180);
    cardFrame.primaryAxisSizingMode = 'AUTO';
    cardFrame.cornerRadius = 24;
    cardFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.85 }];
    cardFrame.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0.47, g: 0.44, b: 0.42, a: 0.06 },
        offset: { x: 0, y: 8 },
        radius: 32,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL',
    }];

    const cardTitle = figma.createText();
    try { cardTitle.fontName = { family: 'Nunito', style: 'Bold' }; } catch { cardTitle.fontName = { family: 'Inter', style: 'Regular' }; }
    cardTitle.characters = 'Анна — проверенная няня';
    cardTitle.fontSize = 18;
    cardTitle.fills = [{ type: 'SOLID', color: colors['cloud/text'] }];
    cardFrame.appendChild(cardTitle);

    const cardBody = figma.createText();
    cardBody.fontName = { family: 'Inter', style: 'Regular' };
    cardBody.characters = 'Опыт 5 лет • Педагогическое образование • Совместимость 97%';
    cardBody.fontSize = 14;
    cardBody.fills = [{ type: 'SOLID', color: colors['cloud/text-muted'] }];
    cardBody.resize(300, cardBody.height);
    cardBody.textAutoResize = 'HEIGHT';
    cardFrame.appendChild(cardBody);

    page.appendChild(cardFrame);
    cardFrame.x = 0;
    cardFrame.y = badgeFrame.y + badgeFrame.height + 60;

    // ===== Create Spacing Reference =====
    const spaceFrame = figma.createFrame();
    spaceFrame.name = '📏 Spacing';
    spaceFrame.layoutMode = 'HORIZONTAL';
    spaceFrame.itemSpacing = 16;
    spaceFrame.paddingLeft = 32;
    spaceFrame.paddingRight = 32;
    spaceFrame.paddingTop = 32;
    spaceFrame.paddingBottom = 32;
    spaceFrame.counterAxisSizingMode = 'AUTO';
    spaceFrame.primaryAxisSizingMode = 'AUTO';
    spaceFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    for (const sp of spacings) {
        const block = figma.createFrame();
        block.name = `space-${sp.name}`;
        block.layoutMode = 'VERTICAL';
        block.itemSpacing = 4;
        block.counterAxisSizingMode = 'AUTO';
        block.primaryAxisSizingMode = 'AUTO';
        block.counterAxisAlignItems = 'CENTER';

        const rect = figma.createRectangle();
        rect.resize(sp.value, sp.value);
        rect.fills = [{ type: 'SOLID', color: colors['cloud/honey-solid'] }];
        rect.cornerRadius = 4;
        block.appendChild(rect);

        const label = figma.createText();
        label.fontName = { family: 'Inter', style: 'Regular' };
        label.characters = `${sp.name}\n${sp.value}px`;
        label.fontSize = 10;
        label.textAlignHorizontal = 'CENTER';
        label.fills = [{ type: 'SOLID', color: colors['cloud/text-muted'] }];
        block.appendChild(label);

        spaceFrame.appendChild(block);
    }

    page.appendChild(spaceFrame);
    spaceFrame.x = 0;
    spaceFrame.y = cardFrame.y + cardFrame.height + 60;

    // Done!
    figma.closePlugin('✅ Blizko Design System создана!\n🎨 Цвета • 📝 Типографика • 🔘 Кнопки • 🏷️ Бейджи • 🃏 Карточка • 📏 Spacing');
}

main();

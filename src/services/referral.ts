import { supabase, hasSupabaseClient } from './supabase';
import { getItem, setItem } from '@/core/platform/storage';

// Types
export interface Referral {
    id: string;
    referrer_id: string;
    referrer_name: string;
    referred_email?: string;
    referred_phone?: string;
    code: string;
    status: 'pending' | 'signed_up' | 'completed';
    reward_given: boolean;
    created_at: string;
}

const STORAGE_KEY = 'blizko_referrals';
const CODE_KEY = 'blizko_my_referral_code';

function getLocalReferrals(): Referral[] {
    const raw = getItem(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as Referral[]; } catch { return []; }
}

function setLocalReferrals(items: Referral[]): void {
    setItem(STORAGE_KEY, JSON.stringify(items));
}

// Generate unique referral code
export function generateReferralCode(userId: string): string {
    const existing = getItem(CODE_KEY);
    if (existing) return existing;

    const code = `BLZ-${userId.slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setItem(CODE_KEY, code);
    return code;
}

// Get current user's referral code
export function getMyReferralCode(): string | null {
    return getItem(CODE_KEY);
}

// Create referral invite
export async function createReferral(data: {
    referrer_id: string;
    referrer_name: string;
    referred_email?: string;
    referred_phone?: string;
}): Promise<Referral> {
    const code = generateReferralCode(data.referrer_id);

    const referral: Referral = {
        id: crypto.randomUUID(),
        ...data,
        code,
        status: 'pending',
        reward_given: false,
        created_at: new Date().toISOString(),
    };

    const local = getLocalReferrals();
    setLocalReferrals([referral, ...local]);

    if (hasSupabaseClient && supabase) {
        try {
            await supabase.from('referrals').insert(referral);
        } catch (e) {
            console.error('[Referral] remote save failed:', e);
        }
    }

    return referral;
}

// Get referrals by user
export async function getMyReferrals(userId: string): Promise<Referral[]> {
    if (hasSupabaseClient && supabase) {
        try {
            const { data, error } = await supabase
                .from('referrals')
                .select('*')
                .eq('referrer_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) return data as Referral[];
        } catch (e) {
            console.error('[Referral] fetch failed:', e);
        }
    }

    return getLocalReferrals().filter(r => r.referrer_id === userId);
}

// Update referral status
export async function updateReferralStatus(
    referralId: string,
    status: Referral['status']
): Promise<void> {
    const local = getLocalReferrals();
    const idx = local.findIndex(r => r.id === referralId);
    if (idx !== -1) {
        local[idx] = { ...local[idx], status };
        setLocalReferrals(local);
    }

    if (hasSupabaseClient && supabase) {
        try {
            await supabase.from('referrals').update({ status }).eq('id', referralId);
        } catch (e) {
            console.error('[Referral] status update failed:', e);
        }
    }
}

// Generate share link
export function getReferralShareLink(code: string): string {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://blizko.app';
    return `${base}/?ref=${code}`;
}

// Get share text for messenger/social
export function getReferralShareText(code: string): string {
    const link = getReferralShareLink(code);
    return `🤝 Я нашла няню через Blizko — AI-подбор с проверкой!\n\nПопробуй бесплатно по моей ссылке:\n${link}\n\nПервый подбор бесплатный 💛`;
}

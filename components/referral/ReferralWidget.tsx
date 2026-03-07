import React, { useState } from 'react';
import { Copy, Share2, Gift, CheckCircle, Users, Sparkles } from 'lucide-react';
import { generateReferralCode, getReferralShareText, getReferralShareLink } from '../../services/referral';

interface ReferralWidgetProps {
    userId: string;
    userName: string;
}

export const ReferralWidget: React.FC<ReferralWidgetProps> = ({ userId, userName }) => {
    const [copied, setCopied] = useState(false);
    const code = generateReferralCode(userId);
    const shareLink = getReferralShareLink(code);
    const shareText = getReferralShareText(code);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
            const input = document.createElement('input');
            input.value = shareLink;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Blizko — безопасный подбор нянь',
                    text: shareText,
                    url: shareLink,
                });
            } catch { /* user cancelled */ }
        } else {
            handleCopy();
        }
    };

    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100/50">
            <div className="flex items-center gap-2 mb-3">
                <Gift size={20} className="text-amber-600" />
                <h3 className="font-semibold text-stone-800">Пригласите подругу</h3>
            </div>

            <p className="text-sm text-stone-500 mb-4">
                Поделитесь ссылкой — подруга получит <strong>бесплатный первый подбор</strong> 💛
            </p>

            {/* Referral code display */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between mb-3">
                <div>
                    <div className="text-xs text-stone-400 mb-0.5">Ваш код</div>
                    <div className="font-mono font-bold text-amber-700 text-lg tracking-wider">{code}</div>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium transition-colors"
                >
                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                    {copied ? 'Скопировано!' : 'Копировать'}
                </button>
            </div>

            {/* Share buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors"
                >
                    <Share2 size={16} />
                    Поделиться
                </button>
                <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-colors"
                >
                    Telegram
                </a>
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium text-sm transition-colors"
                >
                    WhatsApp
                </a>
            </div>

            {/* Stats */}
            <div className="mt-4 flex items-center gap-4 text-xs text-stone-400">
                <div className="flex items-center gap-1">
                    <Users size={13} />
                    <span>0 приглашений</span>
                </div>
                <div className="flex items-center gap-1">
                    <Sparkles size={13} />
                    <span>0 бонусов</span>
                </div>
            </div>
        </div>
    );
};

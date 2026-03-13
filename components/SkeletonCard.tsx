import React from 'react';

/**
 * SkeletonCard — Animated placeholder for loading nanny cards.
 * Uses Tailwind's `animate-pulse` for the shimmer effect.
 */
export const SkeletonCard: React.FC = () => (
    <div className="grid grid-cols-5 gap-2.5 animate-pulse">
        {/* Row 1: Profile hero */}
        <div className="col-span-5 bg-white/80 rounded-3xl border border-stone-100/60 p-5">
            <div className="flex items-center gap-x-4">
                <div className="w-[72px] h-[72px] rounded-[20px] bg-stone-200/60 flex-shrink-0" />
                <div className="flex-1 space-y-2.5">
                    <div className="h-5 w-3/5 bg-stone-200/60 rounded-full" />
                    <div className="h-3 w-2/5 bg-stone-100/80 rounded-full" />
                </div>
            </div>
        </div>

        {/* Row 2: Score + Trust */}
        <div className="col-span-2 bg-white/80 rounded-3xl border border-stone-100/60 p-3 flex flex-col items-center justify-center gap-2">
            <div className="w-[76px] h-[76px] rounded-full bg-stone-200/60" />
            <div className="h-2 w-16 bg-stone-100/80 rounded-full" />
        </div>
        <div className="col-span-3 bg-white/80 rounded-3xl border border-stone-100/60 p-3 space-y-2">
            <div className="h-2 w-14 bg-stone-100/80 rounded-full" />
            <div className="flex flex-wrap gap-1.5">
                <div className="h-5 w-20 bg-stone-100/80 rounded-full" />
                <div className="h-5 w-16 bg-stone-100/80 rounded-full" />
                <div className="h-5 w-24 bg-stone-100/80 rounded-full" />
            </div>
        </div>

        {/* Row 3: AI Explanation */}
        <div className="col-span-5 bg-white/80 rounded-3xl border border-stone-100/60 p-4">
            <div className="flex gap-x-4">
                <div className="w-8 h-8 min-w-[2rem] rounded-xl bg-stone-200/60 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-2 w-28 bg-stone-100/80 rounded-full" />
                    <div className="h-3 w-full bg-stone-200/60 rounded-full" />
                    <div className="h-3 w-4/5 bg-stone-200/60 rounded-full" />
                </div>
            </div>
        </div>

        {/* Row 4: Action Buttons */}
        <div className="col-span-5 grid grid-cols-5 gap-2.5">
            <div className="col-span-3 h-12 bg-stone-200/60 rounded-2xl" />
            <div className="col-span-2 h-12 bg-stone-100/80 rounded-2xl" />
        </div>
    </div>
);

/**
 * SkeletonList — Multiple skeleton cards for the loading state.
 */
export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="space-y-8 px-4 pt-4">
        {/* Header skeleton */}
        <div className="flex flex-col items-center gap-3 animate-pulse">
            <div className="h-10 w-64 bg-stone-200/60 rounded-full" />
            <div className="h-4 w-48 bg-stone-100/80 rounded-full" />
        </div>

        {/* Card skeletons */}
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
        ))}
    </div>
);

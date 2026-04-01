import React from 'react';
import { Skeleton } from '@/components/ui/feedback-primitives';

/**
 * Skeleton placeholder for a CandidateCard in glass style.
 * Shows during loading or when match results are being fetched.
 */
export const SkeletonNannyCard: React.FC = () => (
  <div className="overflow-hidden rounded-[2rem] bg-white p-6 sm:p-8 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)]">
    <div className="flex items-start gap-5">
      <Skeleton className="h-[72px] w-[72px] rounded-[24px]" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-6 w-40 rounded-lg" />
        <Skeleton className="h-4 w-56 rounded-lg" />
      </div>
      <Skeleton className="h-16 w-14 rounded-[20px]" />
    </div>
    <div className="mt-5 flex justify-center">
      <Skeleton className="h-4 w-4 rounded-full" />
    </div>
  </div>
);

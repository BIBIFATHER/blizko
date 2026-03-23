import React, { useState, useEffect } from 'react';
import { X, Briefcase } from 'lucide-react';
import { Language, User, Review, NannyProfile, ParentRequest } from '@/core/types';
import { t } from '@/core/i18n/translations';
import { getMyNannyProfile } from '@/services/storage';
import { PaymentModal } from './PaymentModal';
import { ProfileTab } from './profile/ProfileTab';
import { BookingsTab } from './profile/BookingsTab';
import { ReviewsTab } from './profile/ReviewsTab';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  lang: Language;
  onEditProfile?: (profile?: NannyProfile) => void;
  onEditParentRequest?: (request?: ParentRequest) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user, onClose, onLogout, lang, onEditProfile, onEditParentRequest,
}) => {
  const text = t[lang];
  const isNanny = user.role === 'nanny';
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings' | 'reviews'>('profile');
  const [reviews, setReviews] = useState<Review[]>([]);

  // Payment state (shared across tabs)
  const [showPayment, setShowPayment] = useState(false);
  const [paymentType, setPaymentType] = useState<'registration' | 'commission'>('registration');
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    if (isNanny) {
      getMyNannyProfile(user).then((myProfile) => {
        if (myProfile?.reviews) setReviews(myProfile.reviews);
      });
    }
  }, [isNanny, user.name]);

  const handlePaymentSuccess = () => {
    setShowPayment(false);
  };

  const handleReviewSubmit = (review: Review) => {
    setReviews((prev) => [...prev, review]);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
        <div className="card-cloud w-full max-w-md overflow-hidden rounded-[2rem] animate-slide-up relative flex max-h-[90vh] flex-col border border-white/70">

          {/* Header with Tabs */}
          <div className="sticky top-0 z-10 border-b border-[color:var(--cloud-border)] bg-white/90 px-6 pb-3 pt-6 backdrop-blur">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <div className="eyebrow">Account Surface</div>
                <h3 className="text-2xl text-stone-900">
                  {isNanny ? text.nannyDashTitle : text.profileTitle}
                </h3>
                {isNanny && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    <Briefcase size={10} /> Nanny
                  </span>
                )}
              </div>
              <button onClick={onClose} className="rounded-full border border-[color:var(--cloud-border)] bg-white/85 p-2 text-stone-400 transition-colors hover:text-stone-800">
                <X size={18} />
              </button>
            </div>

            <div className="surface-panel flex rounded-[18px] p-1.5">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 rounded-[14px] py-2.5 text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                {text.tabProfile}
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`flex-1 rounded-[14px] py-2.5 text-sm font-medium transition-all ${activeTab === 'bookings' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                {isNanny ? text.tabRequests : text.tabBookings}
              </button>
              {isNanny && (
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex-1 rounded-[14px] py-2.5 text-sm font-medium transition-all ${activeTab === 'reviews' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  {text.tabReviews}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[rgba(252,248,241,0.76)] p-6">
            {activeTab === 'profile' && (
              <ProfileTab
                user={user}
                lang={lang}
                onLogout={onLogout}
                onEditProfile={onEditProfile}
                onEditParentRequest={onEditParentRequest}
              />
            )}
            {activeTab === 'bookings' && (
              <BookingsTab
                user={user}
                lang={lang}
                onReviewSubmit={handleReviewSubmit}
              />
            )}
            {activeTab === 'reviews' && isNanny && (
              <ReviewsTab reviews={reviews} lang={lang} />
            )}
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          amount={paymentAmount}
          title={paymentType === 'registration' ? text.payRegistration : text.payCommission}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
          lang={lang}
        />
      )}
    </>
  );
};

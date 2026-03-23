import React, { useState, useEffect } from 'react';
import { X, Briefcase } from 'lucide-react';
import { Language, User, Review, NannyProfile, ParentRequest } from '../types';
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
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up relative flex flex-col max-h-[90vh]">

          {/* Header with Tabs */}
          <div className="pt-6 pb-2 px-6 bg-white/95 border-b border-stone-100 sticky top-0 z-10 backdrop-blur">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-stone-800">
                  {isNanny ? text.nannyDashTitle : text.profileTitle}
                </h3>
                {isNanny && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider mt-1">
                    <Briefcase size={10} /> Nanny
                  </span>
                )}
              </div>
              <button onClick={onClose} className="text-stone-400 hover:text-stone-800 transition-colors bg-stone-100 p-1 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="flex bg-stone-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'profile' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                {text.tabProfile}
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'bookings' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                {isNanny ? text.tabRequests : text.tabBookings}
              </button>
              {isNanny && (
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'reviews' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  {text.tabReviews}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
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

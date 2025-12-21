import React, { useState, useEffect } from 'react';
import { Button, Card } from './UI';
import { X, User as UserIcon, LogOut, Clock, Calendar, MessageSquare, CheckCircle, Wallet, Star, ShieldCheck, MapPin, Briefcase, MessageCircle, Edit, Lock, Phone, Mail, BadgeCheck } from 'lucide-react';
import { Language, User, Booking, Review, NannyProfile } from '../types';
import { t } from '../src/core/i18n/translations';
import { NannyChatModal } from './NannyChatModal';
import { PaymentModal } from './PaymentModal';
import { LeaveReviewModal } from './LeaveReviewModal';
import { getNannyProfiles, addReview } from '../services/storage';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  lang: Language;
  onEditProfile?: (profile?: NannyProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose, onLogout, lang, onEditProfile }) => {
  const text = t[lang];
  const isNanny = user.role === 'nanny';
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings' | 'reviews'>('profile');
  const [chatBooking, setChatBooking] = useState<Booking | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  
  // Payment State
  const [showPayment, setShowPayment] = useState(false);
  const [isRegistrationPaid, setIsRegistrationPaid] = useState(false);
  const [paymentType, setPaymentType] = useState<'registration' | 'commission'>('registration');
  const [paymentAmount, setPaymentAmount] = useState(''); 
  
  // Data States
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myNannyProfile, setMyNannyProfile] = useState<NannyProfile | undefined>(undefined);
  
  // Mock Earnings
  const earnedTotal = 12500;
  const commissionRate = 0.2; 
  const commissionDue = earnedTotal * commissionRate; 

  useEffect(() => {
    if (isNanny) {
      const storedNannies = getNannyProfiles();
      const myProfile = storedNannies.find(n => n.name === user.name);
      setMyNannyProfile(myProfile);

      if (myProfile && myProfile.reviews) {
        setReviews(myProfile.reviews);
      } else if (storedNannies.length > 0 && storedNannies[0].reviews) {
        setReviews(storedNannies[0].reviews);
      }
    }
  }, [isNanny, user.name]);

  // --- MOCK DATA for Demo ---
  const nannyRequests = [
    {
      id: 'r1',
      parentName: lang === 'ru' ? 'Семья Смирновых' : 'The Smith Family',
      location: lang === 'ru' ? 'Хамовники' : 'Soho',
      details: lang === 'ru' ? '2 детей (3г, 5л)' : '2 kids (3y, 5y)',
      schedule: lang === 'ru' ? 'Пн, Ср, Пт 10:00 - 14:00' : 'Mon, Wed, Fri 10am - 2pm',
      rate: lang === 'ru' ? '800 ₽/час' : '$25/hr'
    },
    {
      id: 'r2',
      parentName: lang === 'ru' ? 'Ольга В.' : 'Olga V.',
      location: lang === 'ru' ? 'Арбат' : 'Chelsea',
      details: lang === 'ru' ? 'Грудничок (6 мес)' : 'Infant (6mo)',
      schedule: lang === 'ru' ? 'Разово, 12 Окт' : 'One-time, Oct 12',
      rate: lang === 'ru' ? '1000 ₽/час' : '$30/hr'
    }
  ];

  const [activeBooking, setActiveBooking] = useState<Booking | null>({
    id: 'b1',
    nannyName: lang === 'ru' ? 'Мария И.' : 'Maria I.',
    date: lang === 'ru' ? 'Сегодня, 14:00 - 18:00' : 'Today, 2:00 PM - 6:00 PM',
    status: 'active',
    amount: '2 400 ₽',
    avatarColor: 'bg-emerald-100 text-emerald-700',
    isPaid: false 
  });

  const [historyBookings, setHistoryBookings] = useState<Booking[]>([
    {
      id: 'b2',
      nannyName: lang === 'ru' ? 'Елена С.' : 'Elena S.',
      date: '10 Oct, 10:00 - 14:00',
      status: 'completed',
      amount: '1 500 ₽',
      avatarColor: 'bg-purple-100 text-purple-700',
      isPaid: true,
      hasReview: false
    },
    {
      id: 'b3',
      nannyName: lang === 'ru' ? 'Анна К.' : 'Anna K.',
      date: '01 Oct, 18:00 - 22:00',
      status: 'completed',
      amount: '2 000 ₽',
      avatarColor: 'bg-amber-100 text-amber-700',
      isPaid: true,
      hasReview: true
    }
  ]);

  const handlePaymentClick = (type: 'registration' | 'commission') => {
    setPaymentType(type);
    setPaymentAmount(type === 'registration' ? '5 000 ₽' : `${commissionDue.toLocaleString('ru-RU')} ₽`);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    if (paymentType === 'registration') {
      setIsRegistrationPaid(true);
    }
    setShowPayment(false);
  };

  const handleReviewSubmit = (review: Review) => {
    setHistoryBookings(prev => prev.map(b => b.id === review.bookingId ? { ...b, hasReview: true } : b));
    addReview(review);
    setReviewBookingId(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up relative flex flex-col max-h-[90vh]">
          
          {/* Header with Tabs */}
          <div className="pt-6 pb-2 px-6 bg-white border-b border-stone-100">
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
                <button 
                  onClick={onClose} 
                  className="text-stone-400 hover:text-stone-800 transition-colors bg-stone-100 p-1 rounded-full"
                >
                  <X size={18} />
                </button>
             </div>
             
             <div className="flex bg-stone-100 p-1 rounded-xl">
               <button 
                 onClick={() => setActiveTab('profile')}
                 className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                   activeTab === 'profile' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                 }`}
               >
                 {text.tabProfile}
               </button>
               <button 
                 onClick={() => setActiveTab('bookings')}
                 className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                   activeTab === 'bookings' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                 }`}
               >
                 {isNanny ? text.tabRequests : text.tabBookings}
               </button>
               {isNanny && (
                 <button 
                   onClick={() => setActiveTab('reviews')}
                   className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                     activeTab === 'reviews' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                   }`}
                 >
                   {text.tabReviews}
                 </button>
               )}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="animate-fade-in space-y-6 text-center">
                
                {/* Profile Header */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 relative">
                  <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4 border-4 border-white shadow-lg relative ${isNanny ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'} overflow-hidden`}>
                    {myNannyProfile?.photo ? (
                      <img src={myNannyProfile.photo} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={40} />
                    )}
                    {isNanny && myNannyProfile?.isVerified && (
                      <div className="absolute bottom-0 right-0 bg-green-500 border-2 border-white w-6 h-6 rounded-full flex items-center justify-center text-white" title="Verified">
                        <ShieldCheck size={12} />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-stone-800">{user.name || 'User'}</h3>
                  
                  {/* Verified Contact Info */}
                  <div className="flex flex-col items-center gap-1.5 mt-2">
                     {user.phone && (
                       <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs font-medium">
                         <Phone size={12} /> {user.phone} <BadgeCheck size={12} fill="currentColor" className="text-green-500" />
                       </div>
                     )}
                     {user.email && (
                       <div className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 px-2 py-1 rounded-md text-xs font-medium">
                         <Mail size={12} /> {user.email} <BadgeCheck size={12} fill="currentColor" className="text-sky-500" />
                       </div>
                     )}
                  </div>
                  
                  {isNanny && (
                    <div className="flex justify-center gap-4 border-t border-stone-100 pt-4 mt-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-stone-800 flex items-center justify-center gap-1">
                          4.9 <Star size={12} className="fill-amber-400 text-amber-400" />
                        </div>
                        <div className="text-[10px] text-stone-400 uppercase">{text.statRating}</div>
                      </div>
                      <div className="w-px bg-stone-100" />
                      <div className="text-center">
                        <div className="text-lg font-bold text-stone-800">124</div>
                        <div className="text-[10px] text-stone-400 uppercase">{text.statHours}</div>
                      </div>
                      <div className="w-px bg-stone-100" />
                      <div className="text-center">
                        <div className="text-lg font-bold text-stone-800">15</div>
                        <div className="text-[10px] text-stone-400 uppercase">{text.statReviews}</div>
                      </div>
                    </div>
                  )}
                </div>

                {isNanny && (
                   <>
                    <Button onClick={() => onEditProfile && onEditProfile(myNannyProfile)} className="bg-amber-100 text-amber-900 hover:bg-amber-200">
                      <Edit size={16} /> {myNannyProfile ? (lang === 'ru' ? 'Редактировать анкету' : 'Edit Profile') : (lang === 'ru' ? 'Заполнить анкету' : 'Fill Profile')}
                    </Button>

                    <Card className={`!p-5 text-white flex justify-between items-center shadow-lg transition-colors ${!isRegistrationPaid ? 'bg-stone-800 shadow-stone-200' : 'bg-[#6C2586] shadow-purple-200'}`}>
                      <div className="text-left">
                        <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">
                          {!isRegistrationPaid ? text.regFeeLabel : text.nannyWallet}
                        </p>
                        <p className="text-2xl font-bold">
                          {!isRegistrationPaid ? '5 000 ₽' : `${earnedTotal.toLocaleString('ru-RU')} ₽`}
                        </p>
                      </div>
                      
                      {!isRegistrationPaid ? (
                        <button 
                           onClick={() => handlePaymentClick('registration')}
                           className="bg-white hover:bg-stone-200 text-stone-900 px-4 py-2 rounded-xl transition-all text-xs font-bold flex flex-col items-center gap-1"
                        >
                          <Lock size={16} />
                          {text.payRegistration}
                        </button>
                      ) : (
                        <button 
                           onClick={() => handlePaymentClick('commission')}
                           className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all text-xs font-bold flex flex-col items-center gap-1 border border-white/30"
                        >
                          <Wallet size={16} />
                          {text.payCommission}
                        </button>
                      )}
                    </Card>
                    
                    {!isRegistrationPaid && (
                      <p className="text-xs text-stone-400 mt-[-1rem]">
                        {lang === 'ru' ? 'Для начала работы необходимо оплатить единоразовый взнос.' : 'To start working, you must pay a one-time fee.'}
                      </p>
                    )}
                   </>
                )}

                {/* Parent Profile Content */}
                {!isNanny && (
                  <div className="text-left space-y-4">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">{text.myApplications}</h4>
                    <Card className="!p-4 bg-white border border-stone-100 flex items-center gap-3">
                      <div className="bg-stone-50 p-2.5 rounded-xl text-stone-400 shadow-sm">
                        <Clock size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-stone-700">{lang === 'ru' ? 'Заявка на проверке' : 'Application Pending'}</div>
                        <div className="text-xs text-stone-400">ID: #4829 • {new Date().toLocaleDateString()}</div>
                      </div>
                    </Card>
                  </div>
                )}

                <Button variant="outline" onClick={onLogout} className="w-full text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200">
                  <LogOut size={18} /> {text.logout}
                </Button>
              </div>
            )}

            {/* BOOKINGS / REQUESTS TAB */}
            {activeTab === 'bookings' && (
              <div className="animate-fade-in space-y-6">
                
                {/* NANNY: REQUESTS */}
                {isNanny ? (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"/>
                       {text.nannyRequests}
                    </h4>
                    {nannyRequests.map(req => (
                      <Card key={req.id} className="!p-5 border-stone-200">
                         <div className="flex justify-between items-start mb-2">
                           <div>
                             <h4 className="font-bold text-stone-800">{req.parentName}</h4>
                             <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                               <MapPin size={10} /> {req.location}
                             </div>
                           </div>
                           <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg">
                             {req.rate}
                           </span>
                         </div>
                         
                         <div className="space-y-2 mb-4 mt-3">
                           <div className="text-sm text-stone-600 bg-stone-50 p-2 rounded-lg flex gap-2 items-center">
                             <span className="text-stone-400"><Briefcase size={14}/></span> {req.details}
                           </div>
                           <div className="text-sm text-stone-600 bg-stone-50 p-2 rounded-lg flex gap-2 items-center">
                             <span className="text-stone-400"><Calendar size={14}/></span> {req.schedule}
                           </div>
                         </div>

                         <div className="flex gap-2">
                           <Button className="py-2 text-sm flex-1 bg-stone-800 text-white hover:bg-stone-700">
                             {text.accept}
                           </Button>
                           <Button variant="outline" className="py-2 text-sm flex-1">
                             {text.decline}
                           </Button>
                         </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  // PARENT: BOOKINGS
                  <>
                    {/* Active Booking Section */}
                    {activeBooking && (
                      <div>
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
                           {text.activeBookingTitle}
                        </h4>
                        <Card className="!p-0 overflow-hidden border-amber-200 bg-amber-50/30">
                          <div className="p-4">
                             <div className="flex justify-between items-start mb-3">
                               <div className="flex items-center gap-3">
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${activeBooking.avatarColor}`}>
                                   {activeBooking.nannyName.charAt(0)}
                                 </div>
                                 <div>
                                   <div className="font-bold text-stone-800">{activeBooking.nannyName}</div>
                                   <div className="text-xs text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                     {text.statusActive}
                                   </div>
                                 </div>
                               </div>
                               <div className="text-right">
                                 <div className="text-sm font-semibold text-stone-700">{activeBooking.amount}</div>
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-2 text-sm text-stone-600 bg-white/60 p-2 rounded-lg mb-4">
                                <Calendar size={16} className="text-stone-400" />
                                {activeBooking.date}
                             </div>

                             <div className="grid grid-cols-1 gap-2">
                               <Button 
                                 onClick={() => setChatBooking(activeBooking)} 
                                 className="py-3 text-sm bg-stone-800 text-white hover:bg-stone-700"
                               >
                                 <MessageSquare size={16} /> <span className="hidden xs:inline">{text.chatWithNanny}</span>
                               </Button>
                             </div>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* History Section */}
                    <div>
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
                        {text.historyTitle}
                      </h4>
                      <div className="space-y-3">
                        {historyBookings.map(booking => (
                          <Card key={booking.id} className="!p-4 flex flex-col gap-2 border-stone-100 bg-white">
                            <div className="flex justify-between items-start">
                               <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${booking.avatarColor}`}>
                                   {booking.nannyName.charAt(0)}
                                 </div>
                                 <div>
                                   <div className="font-semibold text-stone-700 text-sm">{booking.nannyName}</div>
                                   <div className="text-[10px] text-stone-400">{booking.date}</div>
                                 </div>
                               </div>
                               <div className="text-right">
                                 <div className="text-xs font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded-full mb-1">
                                   {text.statusCompleted}
                                 </div>
                                 <div className="text-[10px] text-stone-400">{booking.amount}</div>
                               </div>
                            </div>
                            
                            {!booking.hasReview && (
                              <button 
                                onClick={() => setReviewBookingId(booking.id)}
                                className="mt-2 w-full py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                              >
                                <Star size={14} /> {text.leaveReview}
                              </button>
                            )}

                            {booking.hasReview && (
                              <div className="mt-2 text-xs text-green-600 flex items-center justify-center gap-1 bg-green-50 py-1 rounded-lg">
                                <CheckCircle size={12} /> {text.reviewThanks}
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              </div>
            )}
            
            {/* REVIEWS TAB (NANNY ONLY) */}
            {activeTab === 'reviews' && isNanny && (
              <div className="animate-fade-in space-y-4">
                 {reviews.length === 0 ? (
                   <div className="text-center py-12 text-stone-400">
                     <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                     <p>{text.noReviews}</p>
                   </div>
                 ) : (
                   reviews.map(review => (
                     <Card key={review.id} className="!p-4 border-stone-100 bg-white">
                       <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-bold text-xs">
                             {review.authorName.charAt(0)}
                           </div>
                           <div>
                             <div className="text-sm font-bold text-stone-800">{review.authorName}</div>
                             <div className="text-[10px] text-stone-400">{new Date(review.date).toLocaleDateString()}</div>
                           </div>
                         </div>
                         <div className="flex gap-0.5">
                           {[1,2,3,4,5].map(star => (
                             <Star 
                               key={star} 
                               size={12} 
                               className={`${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'} transition-colors`} 
                             />
                           ))}
                         </div>
                       </div>
                       <p className="text-sm text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-lg">
                         "{review.text}"
                       </p>
                     </Card>
                   ))
                 )}
              </div>
            )}

          </div>
        </div>
      </div>

      {chatBooking && (
        <NannyChatModal 
          nannyName={chatBooking.nannyName}
          onClose={() => setChatBooking(null)}
          lang={lang}
        />
      )}

      {showPayment && (
        <PaymentModal 
          amount={paymentAmount}
          title={paymentType === 'registration' ? text.payRegistration : text.payCommission}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
          lang={lang}
        />
      )}

      {reviewBookingId && (
        <LeaveReviewModal
          bookingId={reviewBookingId}
          onClose={() => setReviewBookingId(null)}
          onSubmit={handleReviewSubmit}
          lang={lang}
        />
      )}
    </>
  );
};
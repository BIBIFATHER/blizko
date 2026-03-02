
export type Language = 'ru' | 'en';

export interface Review {
  id: string;
  authorName: string;
  rating: number; // 1-5
  text: string;
  date: number;
  bookingId?: string;
}

export interface ParentRequest {
  id: string;
  type: 'parent';
  city: string;
  childAge: string;
  schedule: string;
  budget: string;
  requirements: string[];
  comment: string;
  createdAt: number;
}

export interface SoftSkillsProfile {
  rawScore: number; // 0-100
  dominantStyle: 'Empathetic' | 'Structured' | 'Balanced';
  summary: string; // The "AI" generated text
  completedAt: number;
}

export interface DocumentVerification {
  type: 'passport' | 'medical_book' | 'police_record';
  status: 'verified' | 'rejected' | 'pending';
  documentNumber?: string;
  expiryDate?: string;
  aiConfidence: number; // 0-100
  aiNotes: string;
  verifiedAt: number;
}

export interface NannyProfile {
  id: string;
  type: 'nanny';
  name: string;
  photo?: string; // Base64 or URL
  city: string;
  experience: string;
  childAges: string[];
  skills: string[];
  about: string;
  contact: string;
  isVerified: boolean; // General verification (e.g. GosUslugi)
  documents?: DocumentVerification[]; // New field for uploaded docs
  softSkills?: SoftSkillsProfile;
  videoIntro?: boolean; // Legacy flag
  video?: string; // URL to video
  reviews?: Review[]; // New field for reviews
  createdAt: number;
}

export type ViewState = 'home' | 'parent-form' | 'nanny-form' | 'success' | 'admin';

export interface SubmissionResult {
  matchScore: number;
  recommendations: string[];
}

export interface User {
  email?: string;
  phone?: string;
  name?: string;
  role?: 'parent' | 'nanny';
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: number;
}

export interface Booking {
  id: string;
  nannyName: string;
  date: string;
  status: 'active' | 'completed' | 'cancelled';
  amount: string;
  avatarColor?: string;
  isPaid?: boolean;
  hasReview?: boolean; // Track if reviewed
}

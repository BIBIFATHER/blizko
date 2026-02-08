
export type Language = 'ru' | 'en';

export interface Review {
  id: string;
  authorName: string;
  rating: number; // 1-5
  text: string;
  date: number;
  bookingId?: string;
}

export interface ParentChangeEvent {
  at: number;
  type: 'created' | 'updated' | 'status_changed' | 'resubmitted';
  by?: 'user' | 'admin';
  note?: string;
}

export interface RejectionInfo {
  reasonCode?: 'profile_incomplete' | 'docs_missing' | 'budget_invalid' | 'contact_invalid' | 'other';
  reasonText?: string;
  rejectedAt?: number;
  rejectedBy?: 'admin';
}

export interface ParentRequest {
  id: string;
  type: 'parent';
  status?: 'new' | 'in_review' | 'approved' | 'rejected';
  city: string;
  childAge: string;
  schedule: string;
  budget: string;
  requirements: string[];
  comment: string;
  documents?: DocumentVerification[];
  requesterEmail?: string;
  createdAt: number;
  updatedAt?: number;
  rejectionInfo?: RejectionInfo;
  changeLog?: ParentChangeEvent[];
}

export interface SoftSkillsProfile {
  rawScore: number; // 0-100
  dominantStyle: 'Empathetic' | 'Structured' | 'Balanced';
  summary: string; // The "AI" generated text
  completedAt: number;
}

export interface NormalizedResume {
  fullName?: string;
  city?: string;
  phone?: string;
  email?: string;
  summary?: string;
  experienceYears?: number;
  skills?: string[];
}

export interface DocumentVerification {
  type: 'passport' | 'medical_book' | 'recommendation_letter' | 'education_document' | 'resume' | 'other';
  status: 'verified' | 'rejected' | 'pending';
  documentNumber?: string;
  expiryDate?: string;
  aiConfidence: number; // 0-100
  aiNotes: string;
  verifiedAt: number;
  fileName?: string;
  fileDataUrl?: string;
  normalizedResume?: NormalizedResume;
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
  resumeNormalized?: NormalizedResume; // unified resume format from OCR/AI
  createdAt: number;
}

export type ViewState = 'home' | 'parent-form' | 'nanny-form' | 'success' | 'admin';

export interface SubmissionResult {
  matchScore: number;
  recommendations: string[];
}

export interface User {
  id?: string;
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

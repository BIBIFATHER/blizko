
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

export interface ParentRiskProfile {
  priorityStyle?: 'warmth' | 'discipline' | 'balanced';
  reportingFrequency?: 'daily' | '2_3_times' | 'frequent';
  trustLevel?: 1 | 2 | 3 | 4 | 5;
  familyStyle?: 'warm' | 'structured' | 'balanced';
  childStress?: 'cry' | 'withdraw' | 'aggressive' | 'tantrum';
  triggers?: string[];
  nannyStylePreference?: 'gentle' | 'strict' | 'playful';
  communicationPreference?: 'minimal' | 'regular' | 'frequent';
  needs?: string[];
  pcmType?: 'thinker' | 'persister' | 'harmonizer' | 'rebel' | 'imaginer' | 'promoter';
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
  riskProfile?: ParentRiskProfile;
  createdAt: number;
  updatedAt?: number;
  rejectionInfo?: RejectionInfo;
  changeLog?: ParentChangeEvent[];
  isNannySharing?: boolean;
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

export interface NannyRiskProfile {
  tantrumFirstStep?: 'calm' | 'distract' | 'boundaries';
  routineStyle?: 'structured' | 'balanced' | 'adaptive';
  conflictStyle?: 'discuss_now' | 'pause_then_discuss' | 'avoid';
  emergencyReady?: 'yes' | 'no';
  disciplineStyle?: 'gentle' | 'structured' | 'strict';
  communicationStyle?: 'minimal' | 'regular' | 'frequent';
  strengths?: string[];
  notBestAt?: string;
  pcmType?: 'thinker' | 'persister' | 'harmonizer' | 'rebel' | 'imaginer' | 'promoter';
}

export interface NannyProfile {
  id: string;
  type: 'nanny';
  name: string;
  photo?: string; // Base64 or URL
  city: string;
  experience: string;
  schedule?: string;
  expectedRate?: string;
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
  riskProfile?: NannyRiskProfile;
  isNannySharing?: boolean;
  createdAt: number;
}

export type ViewState = 'home' | 'parent-form' | 'nanny-form' | 'success' | 'admin';

export interface SubmissionResult {
  matchScore: number;
  recommendations: string[];
  matchResult?: MatchResult; // NEW: structured top candidates
}

// --- NEW: Match Result types (Paradox of Choice: max 3 candidates) ---

export interface MatchCandidate {
  nanny: NannyProfile;
  score: number;
  reasons: string[];           // machine reasons
  humanExplanation: string;     // why this nanny fits (Peak-End: emotional moment)
  trustBadges: TrustBadge[];   // Authority Bias: visual trust
}

export type TrustBadge =
  | 'verified_docs'       // ✓ Документы проверены
  | 'verified_moderation'  // ✓ Ручная модерация
  | 'ai_checked'          // ✓ AI-проверка
  | 'soft_skills'         // ✓ Soft skills оценены
  | 'has_reviews';        // ✓ Есть отзывы

export interface MatchResult {
  candidates: MatchCandidate[];  // 0-3 candidates (Paradox of Choice)
  overallAdvice: string;         // context-specific advice for parent
  requestId?: string;
}

// --- NEW: Booking Confirmation (T-24h Loss Aversion) ---

export interface BookingConfirmation {
  id: string;
  bookingId: string;
  type: 't_24h' | 't_1h';
  status: 'pending' | 'confirmed' | 'declined' | 'expired';
  dueAt: number;
  respondedAt?: number;
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
  senderId?: string;
  senderName?: string;
  timestamp: number;
}

export interface Booking {
  id: string;
  parentId?: string;
  nannyId?: string;
  requestId?: string;
  nannyName: string;
  date: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  amount: string;
  avatarColor?: string;
  isPaid?: boolean;
  hasReview?: boolean;
  confirmation?: BookingConfirmation;
}

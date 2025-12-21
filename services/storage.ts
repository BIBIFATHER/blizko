import { ParentRequest, NannyProfile, Review } from '../types';
import { getItem, setItem, removeItem } from '../src/core/platform/storage';

const STORAGE_KEY_PARENTS = 'blizko_parents';
const STORAGE_KEY_NANNIES = 'blizko_nannies';

export const saveParentRequest = (data: Omit<ParentRequest, 'id' | 'createdAt' | 'type'>): ParentRequest => {
  const newRequest: ParentRequest = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    type: 'parent',
  };

  const existing = getParentRequests();
  setItem(STORAGE_KEY_PARENTS, JSON.stringify([newRequest, ...existing]));
  return newRequest;
};

export const saveNannyProfile = (data: Partial<NannyProfile>): NannyProfile => {
  const existing = getNannyProfiles();
  
  if (data.id) {
    const index = existing.findIndex(p => p.id === data.id);
    if (index !== -1) {
      const updatedProfile = { ...existing[index], ...data } as NannyProfile;
      existing[index] = updatedProfile;
      setItem(STORAGE_KEY_NANNIES, JSON.stringify(existing));
      return updatedProfile;
    }
  }

  const newProfile: NannyProfile = {
    reviews: [],
    ...data,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    type: 'nanny',
  } as NannyProfile;

  setItem(STORAGE_KEY_NANNIES, JSON.stringify([newProfile, ...existing]));
  return newProfile;
};

export const getParentRequests = (): ParentRequest[] => {
  const data = getItem(STORAGE_KEY_PARENTS);
  return data ? JSON.parse(data) : [];
};

export const getNannyProfiles = (): NannyProfile[] => {
  const data = getItem(STORAGE_KEY_NANNIES);
  return data ? JSON.parse(data) : [];
};

export const addReview = (review: Review): void => {
  const nannies = getNannyProfiles();
  // For demo: add to the first nanny found, or creates a mock profile if empty
  if (nannies.length === 0) return;
  
  // Attach to first nanny for demo purposes since we don't have IDs in booking mock
  nannies[0].reviews = [review, ...(nannies[0].reviews || [])];
  
  setItem(STORAGE_KEY_NANNIES, JSON.stringify(nannies));
};

export const clearAllData = () => {
  removeItem(STORAGE_KEY_PARENTS);
  removeItem(STORAGE_KEY_NANNIES);
};
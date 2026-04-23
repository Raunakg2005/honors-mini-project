import { UserProfile } from '../types';

/**
 * Weights mapping different tech roles to a similarity score.
 */
const TECH_ROLE_WEIGHTS: Record<string, number> = {
  'Software Engineer': 100,
  'Data Scientist': 80,
  'Product Manager': 60,
  'UX Designer': 50,
};

/**
 * Evaluates a single profile against the active user.
 * Higher score means a better match.
 */
function calculateProfileScore(activeUser: UserProfile, targetProfile: UserProfile): number {
  let score = 0;

  // 1. Core Rule: If both are in the exact same role, massive boost.
  if (activeUser.role === targetProfile.role) {
    score += 200;
  } 
  // 2. Industry matching
  else if (activeUser.industry === targetProfile.industry) {
    score += 50;
    
    // If they are both in Tech but have different roles, apply adjacency weights
    if (activeUser.industry === 'Technology') {
      const targetWeight = TECH_ROLE_WEIGHTS[targetProfile.role] || 10;
      score += targetWeight;
    }
  }

  // 3. Location matching (proximity simulation)
  if (activeUser.location === targetProfile.location) {
    score += 30;
  }

  // 4. Overlapping skills
  const commonSkills = activeUser.skills.filter(skill => targetProfile.skills.includes(skill));
  score += (commonSkills.length * 15);

  return score;
}

/**
 * Sorts an array of profiles based on their compatibility with the active user.
 */
export function sortDeckForUser(activeUser: UserProfile | null, deck: UserProfile[]): UserProfile[] {
  // If no active user or deck is empty, return the deck as-is
  if (!activeUser || !deck.length) return [...deck];

  // Map profiles to their score, then sort by score descending
  return [...deck]
    .map(profile => ({
      profile,
      score: calculateProfileScore(activeUser, profile)
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ profile }) => profile);
}

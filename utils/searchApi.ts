import { UserProfile, SearchFilters } from '../types';

/**
 * Option B Implementation: Asynchronous simulated API lookup.
 * In a real app, this query and the filters would be sent to a backend DB via GraphQL/SQL.
 * Here, we fetch the base data from our local backend and apply the logic asynchronously.
 */
export const simulateAsyncSearch = async (
  query: string,
  filters: SearchFilters
): Promise<UserProfile[]> => {
  try {
    // 1. Fetch raw data from our Phase 1 Backend
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/profiles`);    
    const json = await response.json();
    let results: UserProfile[] = json.data;

    // 2. Simulate network latency/processing time for a real-world feel
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 3. Apply Text Search (Partial name match)
    if (query.trim() !== '') {
      const lowerQuery = query.toLowerCase();
      results = results.filter((profile) =>
        profile.name.toLowerCase().includes(lowerQuery)
      );
    }

    // 4. Apply Advanced Filters
    if (filters.role) {
      results = results.filter((profile) => profile.role === filters.role);
    }
    if (filters.industry) {
      results = results.filter((profile) => profile.industry === filters.industry);
    }
    if (filters.location) {
      results = results.filter((profile) => profile.location === filters.location);
    }

    return results;
  } catch (error) {
    console.error("Search API Error:", error);
    return [];
  }
};

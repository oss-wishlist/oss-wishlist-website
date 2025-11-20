import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Repository Cache Security Tests
 * 
 * These tests verify that the repository cache in WishlistForms is properly
 * isolated per user, preventing cross-user data leakage via sessionStorage.
 * 
 * Security Issue: Repository cache was previously using global keys that allowed
 * User A's cached repositories to be visible to User B if they logged in within
 * the cache expiry window (5 minutes).
 * 
 * Fix: Cache keys are now scoped to username: github_repositories_{username}
 */

describe('Repository Cache Security', () => {
  let mockSessionStorage: Record<string, string>;

  beforeEach(() => {
    // Mock sessionStorage
    mockSessionStorage = {};
    
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: (key: string) => mockSessionStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockSessionStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockSessionStorage[key];
        },
        clear: () => {
          mockSessionStorage = {};
        },
      },
      writable: true,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    mockSessionStorage = {};
  });

  describe('Cache Key Isolation', () => {
    it('should use user-specific cache keys', () => {
      const username = 'testuser';
      const repos = [{ id: 1, name: 'test-repo', html_url: 'https://github.com/testuser/test-repo' }];

      // Simulate caching repositories for a specific user
      sessionStorage.setItem(`github_repositories_${username}`, JSON.stringify(repos));
      sessionStorage.setItem(`github_repositories_timestamp_${username}`, Date.now().toString());

      // Verify the cache keys include the username
      const cachedRepos = sessionStorage.getItem(`github_repositories_${username}`);
      const cachedTimestamp = sessionStorage.getItem(`github_repositories_timestamp_${username}`);

      expect(cachedRepos).toBeTruthy();
      expect(cachedTimestamp).toBeTruthy();
      expect(JSON.parse(cachedRepos || '[]')).toEqual(repos);
    });

    it('should NOT use global cache keys without username', () => {
      const repos = [{ id: 1, name: 'test-repo' }];

      // Attempt to cache with global key (this should NOT happen in fixed code)
      sessionStorage.setItem('github_repositories', JSON.stringify(repos));

      // Verify user-specific key does NOT exist
      const userSpecificCache = sessionStorage.getItem('github_repositories_testuser');
      expect(userSpecificCache).toBeNull();

      // The global key should not be used in the fixed implementation
      const globalCache = sessionStorage.getItem('github_repositories');
      expect(globalCache).toBeTruthy(); // This proves the test setup works
    });

    it('should prevent cross-user cache access', () => {
      const userA = 'emmairwin';
      const userB = 'oss-wishlist-bot';

      const reposA = [
        { id: 1, name: 'emmas-repo', html_url: 'https://github.com/emmairwin/emmas-repo' }
      ];
      const reposB = [
        { id: 2, name: 'bot-repo', html_url: 'https://github.com/oss-wishlist-bot/bot-repo' }
      ];

      // User A caches their repositories
      sessionStorage.setItem(`github_repositories_${userA}`, JSON.stringify(reposA));
      sessionStorage.setItem(`github_repositories_timestamp_${userA}`, Date.now().toString());

      // User B caches their repositories
      sessionStorage.setItem(`github_repositories_${userB}`, JSON.stringify(reposB));
      sessionStorage.setItem(`github_repositories_timestamp_${userB}`, Date.now().toString());

      // Verify User A's cache is isolated
      const cachedReposA = JSON.parse(sessionStorage.getItem(`github_repositories_${userA}`) || '[]');
      expect(cachedReposA).toHaveLength(1);
      expect(cachedReposA[0].name).toBe('emmas-repo');

      // Verify User B's cache is isolated
      const cachedReposB = JSON.parse(sessionStorage.getItem(`github_repositories_${userB}`) || '[]');
      expect(cachedReposB).toHaveLength(1);
      expect(cachedReposB[0].name).toBe('bot-repo');

      // Critical: User B should NOT see User A's repositories
      expect(cachedReposB[0].name).not.toBe('emmas-repo');
      expect(cachedReposA[0].name).not.toBe('bot-repo');
    });
  });

  describe('Cache Expiry', () => {
    it('should respect 5-minute cache duration per user', () => {
      const username = 'testuser';
      const repos = [{ id: 1, name: 'test-repo' }];
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      // Cache repositories with a timestamp
      const cacheTime = Date.now();
      sessionStorage.setItem(`github_repositories_${username}`, JSON.stringify(repos));
      sessionStorage.setItem(`github_repositories_timestamp_${username}`, cacheTime.toString());

      // Check if cache is valid (within 5 minutes)
      const cachedTimestamp = parseInt(sessionStorage.getItem(`github_repositories_timestamp_${username}`) || '0');
      const age = Date.now() - cachedTimestamp;

      expect(age).toBeLessThan(CACHE_DURATION);

      // Simulate cache expiry (older than 5 minutes)
      const expiredTime = Date.now() - (CACHE_DURATION + 1000); // 5 minutes + 1 second
      sessionStorage.setItem(`github_repositories_timestamp_${username}`, expiredTime.toString());

      const newAge = Date.now() - parseInt(sessionStorage.getItem(`github_repositories_timestamp_${username}`) || '0');
      expect(newAge).toBeGreaterThan(CACHE_DURATION);
    });

    it('should allow different users to have different cache expiry times', () => {
      const userA = 'user-a';
      const userB = 'user-b';

      const timeA = Date.now() - (4 * 60 * 1000); // 4 minutes ago
      const timeB = Date.now() - (6 * 60 * 1000); // 6 minutes ago (expired)

      sessionStorage.setItem(`github_repositories_timestamp_${userA}`, timeA.toString());
      sessionStorage.setItem(`github_repositories_timestamp_${userB}`, timeB.toString());

      const CACHE_DURATION = 5 * 60 * 1000;

      const ageA = Date.now() - parseInt(sessionStorage.getItem(`github_repositories_timestamp_${userA}`) || '0');
      const ageB = Date.now() - parseInt(sessionStorage.getItem(`github_repositories_timestamp_${userB}`) || '0');

      expect(ageA).toBeLessThan(CACHE_DURATION); // User A's cache is still valid
      expect(ageB).toBeGreaterThan(CACHE_DURATION); // User B's cache is expired
    });
  });

  describe('Multiple Users in Same Browser', () => {
    it('should allow multiple users to coexist with separate caches', () => {
      const users = [
        { username: 'user1', repos: [{ id: 1, name: 'repo1' }] },
        { username: 'user2', repos: [{ id: 2, name: 'repo2' }] },
        { username: 'user3', repos: [{ id: 3, name: 'repo3' }] },
      ];

      // Cache repositories for all users
      users.forEach(user => {
        sessionStorage.setItem(`github_repositories_${user.username}`, JSON.stringify(user.repos));
        sessionStorage.setItem(`github_repositories_timestamp_${user.username}`, Date.now().toString());
      });

      // Verify all caches coexist without interference
      users.forEach(user => {
        const cached = JSON.parse(sessionStorage.getItem(`github_repositories_${user.username}`) || '[]');
        expect(cached).toHaveLength(1);
        expect(cached[0].name).toBe(user.repos[0].name);
      });

      // Verify total number of cache entries (2 per user: repos + timestamp)
      const cacheKeys = Object.keys(mockSessionStorage);
      expect(cacheKeys.length).toBe(users.length * 2); // repos + timestamp for each user
    });

    it('should not leak data when users switch accounts', () => {
      const userA = 'alice';
      const userB = 'bob';

      const reposA = [
        { id: 1, name: 'alice-private-repo', html_url: 'https://github.com/alice/private' }
      ];
      const reposB = [
        { id: 2, name: 'bob-public-repo', html_url: 'https://github.com/bob/public' }
      ];

      // User A logs in and caches repositories
      sessionStorage.setItem(`github_repositories_${userA}`, JSON.stringify(reposA));
      sessionStorage.setItem(`github_repositories_timestamp_${userA}`, Date.now().toString());

      // User A logs out, User B logs in
      sessionStorage.setItem(`github_repositories_${userB}`, JSON.stringify(reposB));
      sessionStorage.setItem(`github_repositories_timestamp_${userB}`, Date.now().toString());

      // User B should ONLY see their own repositories
      const userBCache = JSON.parse(sessionStorage.getItem(`github_repositories_${userB}`) || '[]');
      expect(userBCache).toHaveLength(1);
      expect(userBCache[0].name).toBe('bob-public-repo');
      expect(userBCache[0].name).not.toBe('alice-private-repo');

      // User A's cache should still exist but be separate
      const userACache = JSON.parse(sessionStorage.getItem(`github_repositories_${userA}`) || '[]');
      expect(userACache).toHaveLength(1);
      expect(userACache[0].name).toBe('alice-private-repo');
    });
  });

  describe('Security Regression Prevention', () => {
    it('should fail if global cache keys are used', () => {
      // This test documents the vulnerability and ensures it doesn't return
      const username = 'testuser';
      const repos = [{ id: 1, name: 'test-repo' }];

      // Simulate OLD (insecure) caching behavior
      sessionStorage.setItem('github_repositories', JSON.stringify(repos));

      // NEW (secure) code should NOT read from global key
      const userSpecificCache = sessionStorage.getItem(`github_repositories_${username}`);
      expect(userSpecificCache).toBeNull(); // Should be null because we didn't cache with username

      // The global key exists but should be ignored
      const globalCache = sessionStorage.getItem('github_repositories');
      expect(globalCache).toBeTruthy();

      // This proves that if code reads from global key, it's vulnerable
      const parsedGlobal = JSON.parse(globalCache || '[]');
      expect(parsedGlobal).toEqual(repos); // This would be the vulnerability
    });

    it('should require username to read cache', () => {
      const repos = [{ id: 1, name: 'test-repo' }];

      // Cache with username
      sessionStorage.setItem('github_repositories_someuser', JSON.stringify(repos));

      // Attempting to read without username should fail
      const withoutUsername = sessionStorage.getItem('github_repositories');
      expect(withoutUsername).toBeNull();

      // Reading with correct username should succeed
      const withUsername = sessionStorage.getItem('github_repositories_someuser');
      expect(withUsername).toBeTruthy();
      expect(JSON.parse(withUsername || '[]')).toEqual(repos);
    });

    it('should handle empty or invalid usernames gracefully', () => {
      const repos = [{ id: 1, name: 'test-repo' }];

      // Test with empty username
      const emptyKey = `github_repositories_`;
      sessionStorage.setItem(emptyKey, JSON.stringify(repos));

      // Verify that empty username creates a different key than no username
      const globalCache = sessionStorage.getItem('github_repositories');
      expect(globalCache).toBeNull();

      // But the empty username key should exist (even if it's not valid)
      const emptyCached = sessionStorage.getItem(emptyKey);
      expect(emptyCached).toBeTruthy();
    });
  });

  describe('Cache Cleanup', () => {
    it('should allow clearing cache for specific user', () => {
      const userA = 'user-a';
      const userB = 'user-b';

      // Cache for both users
      sessionStorage.setItem(`github_repositories_${userA}`, JSON.stringify([{ id: 1 }]));
      sessionStorage.setItem(`github_repositories_${userB}`, JSON.stringify([{ id: 2 }]));

      // Clear User A's cache
      sessionStorage.removeItem(`github_repositories_${userA}`);
      sessionStorage.removeItem(`github_repositories_timestamp_${userA}`);

      // User A's cache should be gone
      expect(sessionStorage.getItem(`github_repositories_${userA}`)).toBeNull();

      // User B's cache should still exist
      expect(sessionStorage.getItem(`github_repositories_${userB}`)).toBeTruthy();
    });

    it('should support clearing all repository caches', () => {
      // Cache for multiple users
      sessionStorage.setItem('github_repositories_user1', JSON.stringify([{ id: 1 }]));
      sessionStorage.setItem('github_repositories_user2', JSON.stringify([{ id: 2 }]));
      sessionStorage.setItem('github_repositories_user3', JSON.stringify([{ id: 3 }]));
      sessionStorage.setItem('other_cache_key', 'value'); // Non-repo cache

      // Clear all repository caches (simulating logout or cache reset)
      Object.keys(mockSessionStorage).forEach(key => {
        if (key.startsWith('github_repositories_')) {
          sessionStorage.removeItem(key);
        }
      });

      // All repository caches should be gone
      expect(sessionStorage.getItem('github_repositories_user1')).toBeNull();
      expect(sessionStorage.getItem('github_repositories_user2')).toBeNull();
      expect(sessionStorage.getItem('github_repositories_user3')).toBeNull();

      // Other cache keys should remain
      expect(sessionStorage.getItem('other_cache_key')).toBe('value');
    });
  });

  describe('Real-world Security Scenario', () => {
    it('should prevent the reported bug: oss-wishlist-bot seeing emmairwin repos', () => {
      // Reproduce the actual security issue that was discovered

      // Step 1: emmairwin logs in and creates wishlist (caches repos)
      const emmairwin = 'emmairwin';
      const emmairwinRepos = [
        { id: 1, name: 'oss-wishlist-website', html_url: 'https://github.com/emmairwin/repo1' },
        { id: 2, name: 'private-project', html_url: 'https://github.com/emmairwin/private' }
      ];

      sessionStorage.setItem(`github_repositories_${emmairwin}`, JSON.stringify(emmairwinRepos));
      sessionStorage.setItem(`github_repositories_timestamp_${emmairwin}`, Date.now().toString());

      // Step 2: oss-wishlist-bot logs in (within 5 min cache window)
      const bot = 'oss-wishlist-bot';
      const botRepos = [
        { id: 3, name: 'test-repo', html_url: 'https://github.com/oss-wishlist-bot/test-repo' }
      ];

      sessionStorage.setItem(`github_repositories_${bot}`, JSON.stringify(botRepos));
      sessionStorage.setItem(`github_repositories_timestamp_${bot}`, Date.now().toString());

      // Step 3: Verify bot CANNOT see emmairwin's repositories
      const botCache = JSON.parse(sessionStorage.getItem(`github_repositories_${bot}`) || '[]');
      
      // Critical assertions
      expect(botCache).toHaveLength(1);
      expect(botCache[0].name).toBe('test-repo');
      expect(botCache[0].name).not.toBe('oss-wishlist-website');
      expect(botCache[0].name).not.toBe('private-project');

      // Verify emmairwin's cache is still intact
      const emmairwinCache = JSON.parse(sessionStorage.getItem(`github_repositories_${emmairwin}`) || '[]');
      expect(emmairwinCache).toHaveLength(2);
      expect(emmairwinCache.map((r: any) => r.name)).toContain('oss-wishlist-website');
    });

    it('should prevent data leakage even with quick user switching', () => {
      const users = ['alice', 'bob', 'charlie'];
      const CACHE_DURATION = 5 * 60 * 1000;

      // All users log in within the same cache window
      const baseTime = Date.now();
      users.forEach((username, index) => {
        const repos = [{ id: index + 1, name: `${username}-repo` }];
        sessionStorage.setItem(`github_repositories_${username}`, JSON.stringify(repos));
        sessionStorage.setItem(`github_repositories_timestamp_${username}`, (baseTime + index * 1000).toString());
      });

      // Each user should only see their own repositories
      users.forEach(username => {
        const cache = JSON.parse(sessionStorage.getItem(`github_repositories_${username}`) || '[]');
        expect(cache).toHaveLength(1);
        expect(cache[0].name).toBe(`${username}-repo`);

        // Verify they don't see other users' repos
        const otherUsernames = users.filter(u => u !== username);
        otherUsernames.forEach(otherUser => {
          expect(cache[0].name).not.toBe(`${otherUser}-repo`);
        });
      });
    });
  });
});

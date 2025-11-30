import { useState, useEffect } from 'react';
import { getApiPath } from '../config/app';
import { getBasePath, withBasePath, withBaseUrl } from '../lib/paths';
import { SUPPORTED_ECOSYSTEMS } from '../lib/ecosystems';
import { 
  validateEmail, 
  validateUrl, 
  validateGitHubUrl, 
  validateLength, 
  checkProfanity,
  type ValidationResult
} from '../lib/realtime-validation';
import { ValidatedInput, ValidatedTextarea, ValidationFeedback } from './ValidatedFormField';

// Heroicon SVG components
const PencilIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RocketIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
);

interface Service {
  id: string;
  title: string;
  description: string;
  category?: string;
  slug?: string;
  available?: boolean;
  practitionerCount?: number;
  unavailableReason?: string;
}

interface Practitioner {
  slug: string;
  name: string;
  github: string;
}

interface WishlistFormProps {
  services?: Service[];
  practitioners?: Practitioner[];
  user?: GitHubUser | null;
  initialRepositories?: GitHubRepository[];
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  repositories: GitHubRepository[];
  authenticated: boolean;
  provider?: 'github' | 'gitlab' | 'google';  // OAuth provider (default: github for backwards compat)
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
}

const WishlistForm = ({ services = [], practitioners = [], user: initialUser = null, initialRepositories = [] }: WishlistFormProps) => {
  const MAX_WISHES = 3;

  // Field validation error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Clear field error when user starts typing
  const clearFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Highlight invalid fields with error messages
  const highlightInvalidFields = (fields: string[]) => {
    const errors: Record<string, string> = {};
    fields.forEach(field => {
      errors[field] = 'This field is required';
    });
    setFieldErrors(errors);
    
    // Scroll to first invalid field
    if (fields.length > 0) {
      const firstField = document.querySelector(`[name="${fields[0]}"], #${fields[0]}`);
      if (firstField) {
        firstField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => (firstField as HTMLElement).focus(), 500);
      }
    }
  };

  // Get border class for field
  const getFieldBorderClass = (fieldName: string) => {
    return fieldErrors[fieldName] 
      ? 'border-red-500 border-2' 
      : 'border-gray-300';
  };

  // Check cache only if we don't have server-provided data
  const initializeFromCache = () => {
    // If we have server-provided repos, use those
    if (initialRepositories && initialRepositories.length > 0) {
      return { repos: initialRepositories, loading: false };
    }
    
    // Otherwise check cache
    if (typeof window === 'undefined') return { repos: [], loading: true };
    
    // Use user-specific cache keys to prevent cross-user data leakage
    const username = initialUser?.login || '';
    if (!username) return { repos: [], loading: true };
    
    const cacheKey = `github_repositories_${username}`;
    const timestampKey = `github_repositories_timestamp_${username}`;
    
    const cachedRepos = sessionStorage.getItem(cacheKey);
    const cacheTimestamp = sessionStorage.getItem(timestampKey);
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    if (cachedRepos && cacheTimestamp) {
      const age = Date.now() - parseInt(cacheTimestamp);
      if (age < CACHE_DURATION) {
        try {
          const parsedRepos = JSON.parse(cachedRepos);
          return { repos: parsedRepos, loading: false };
        } catch (e) {
          return { repos: [], loading: true };
        }
      }
    }
    return { repos: [], loading: true };
  };

  const cachedData = initializeFromCache();
  
  const [user, setUser] = useState<GitHubUser | null>(initialUser);
  const [repositories, setRepositories] = useState<GitHubRepository[]>(cachedData.repos);
  const [loadingRepos, setLoadingRepos] = useState(cachedData.loading);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [selectedAction, setSelectedAction] = useState<'create' | 'edit' | 'close' | null>(null);
  const [existingWishlists, setExistingWishlists] = useState<Record<string, { issueUrl: string; issueNumber: number; isApproved?: boolean; wishTitle?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{
    issueNumber: number;
    issueUrl: string;
    issueTitle: string;
    isUpdate?: boolean;
  } | null>(null);
  const [wishlistApprovalStatus, setWishlistApprovalStatus] = useState<Record<number, boolean>>({});
  const [manualRepoUrl, setManualRepoUrl] = useState('');
  const [manualRepoData, setManualRepoData] = useState<{
    name: string;
    description: string;
    url: string;
    username: string;
  } | null>(null);
  
  // Check for edit mode from URL immediately
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const editParam = urlParams?.get('edit');
  const initialEditMode = editParam ? !isNaN(parseInt(editParam, 10)) : false;
  const initialIssueNumber = editParam ? parseInt(editParam, 10) : null;
  
  // Step management - start at wishlist step if in edit mode
  const [currentStep, setCurrentStep] = useState<'auth' | 'repo' | 'wishlist'>(initialEditMode ? 'wishlist' : 'auth');
  const [isEditingExisting, setIsEditingExisting] = useState(initialEditMode);
  const [existingIssueNumber, setExistingIssueNumber] = useState<number | null>(initialIssueNumber);
  const [originalServices, setOriginalServices] = useState<string[]>([]);
  
  // Wishlist form state
  const [wishlistData, setWishlistData] = useState({
    maintainerEmail: '',
    projectTitle: '',
    selectedServices: [] as string[],
    technologies: [] as string[],
    urgency: 'medium' as 'low' | 'medium' | 'high',
    projectSize: 'medium' as 'small' | 'medium' | 'large',
    timeline: '',
    organizationType: 'single-maintainer' as 'single-maintainer' | 'community-team' | 'company-team' | 'foundation-team' | 'other',
    organizationName: '',
    otherOrganizationType: '',
    additionalNotes: '',
    openToSponsorship: false,
    preferredPractitioner: '',
    nomineeName: '',
    nomineeEmail: '',
    nomineeGithub: ''
  });
  
  // Checkbox for FUNDING.yml PR
  const [createFundingPR, setCreateFundingPR] = useState(false);
  const [fundingYmlProcessed, setFundingYmlProcessed] = useState(false);
  
  // Checkbox for wishlist maintenance reminder acknowledgment
  const [acknowledgeReminders, setAcknowledgeReminders] = useState(false);

  // Real-time validation results for form fields
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});

  // Available services from content collections
  const availableServices = services.length > 0 ? services : [
    { id: 'community-strategy', title: 'Community Strategy', description: 'Help building and growing your community', category: 'Community' },
    { id: 'governance-setup', title: 'Governance Setup', description: 'Establish project governance and decision-making processes', category: 'Governance' },
    { id: 'security-audit', title: 'Security Audit', description: 'Security review and vulnerability assessment', category: 'Security' },
    { id: 'funding-strategy', title: 'Funding Strategy', description: 'Help securing sponsorship and funding', category: 'Strategy' },
    { id: 'documentation', title: 'Documentation', description: 'Improve project documentation and guides', category: 'Documentation' },
    { id: 'marketing', title: 'Marketing & Outreach', description: 'Promote your project and grow adoption', category: 'Marketing' }
  ];

  useEffect(() => {
    // If we have server-provided repos, cache them for future visits with user-specific key
    if (initialRepositories && initialRepositories.length > 0 && typeof window !== 'undefined' && initialUser) {
      const username = initialUser.login;
      sessionStorage.setItem(`github_repositories_${username}`, JSON.stringify(initialRepositories));
      sessionStorage.setItem(`github_repositories_timestamp_${username}`, Date.now().toString());
    }
    
    // If we have cached repos, check for existing wishlists
    if (repositories.length > 0 && !loadingRepos) {
      checkExistingWishlists(repositories.map((r: GitHubRepository) => r.html_url));
    }
    
    // Check for auth callback
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const error = urlParams.get('error');
    
    // Edit mode already handled in initial state
    // Just load the data if we're in edit mode
    if (isEditingExisting && existingIssueNumber) {
      loadExistingWishlistData(existingIssueNumber);
    } else if (authStatus === 'success' || authStatus === 'already_authenticated') {
      // Clear the URL params
      {
        const basePath = getBasePath();
        window.history.replaceState({}, '', `${basePath}maintainers`);
      }
      // Only check user session if we don't have initial user data
      if (!initialUser) {
        checkUserSession();
      }
    } else if (error) {
      setError(`Authentication failed: ${error.replace('_', ' ')}`);
    } else if (!initialUser && repositories.length === 0) {
      // No initial data and no cache - need to check session
      checkUserSession();
    }
  }, []);

  // Removed auto-close success message - let user decide when to leave
  // The success page now stays visible until user clicks a button

  const checkUserSession = async () => {
    try {
      // Check if we already have repositories loaded (from cache initialization)
      // If so, don't show loading state - just verify session in background
      const alreadyHasRepos = repositories.length > 0;
      
      if (alreadyHasRepos) {
        // Verify session in background without showing loading
        fetch(getApiPath('/api/auth/session'))
          .then(response => response.ok ? response.json() : null)
          .then(data => {
            if (data) {
              setUser(data.user);
              // Optionally refresh repos in background
              fetchUserRepositories();
            }
          })
          .catch(() => {});
        return;
      }
      
      // No repos yet - need to fetch, show loading
      setLoadingRepos(true);
      const response = await fetch(getApiPath('/api/auth/session'));
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        // After confirming user is authenticated, fetch their repositories
        await fetchUserRepositories();
      } else {
        setUser(null);
        setRepositories([]);
      }
    } catch (err) {
      setUser(null);
      setRepositories([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const fetchUserRepositories = async () => {
    try {
      const response = await fetch(getApiPath('/api/repositories'));
      
      if (response.ok) {
        const data = await response.json();
        const repos = data.repositories || [];
        setRepositories(repos);
        
        // Cache repositories in sessionStorage with user-specific key
        if (user) {
          const username = user.login;
          sessionStorage.setItem(`github_repositories_${username}`, JSON.stringify(repos));
          sessionStorage.setItem(`github_repositories_timestamp_${username}`, Date.now().toString());
        }
        
        // Check for existing wishlists for these repositories
        if (repos.length > 0) {
          checkExistingWishlists(repos.map((r: GitHubRepository) => r.html_url));
        }
      } else {
        // If fetching fails, just keep repositories empty
        setRepositories([]);
      }
    } catch (err) {
      console.error('Error fetching repositories:', err);
      setRepositories([]);
    }
  };

  const checkExistingWishlists = async (repositoryUrls: string[]) => {
    try {
      const response = await fetch(getApiPath('/api/check-existing-wishlists'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repositoryUrls }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const existingMap: Record<string, { issueUrl: string; issueNumber: number; isApproved?: boolean; wishTitle?: string }> = {};
        const approvalMap: Record<number, boolean> = {};
        
        // Safely handle empty or missing results
        if (!data.results) {
          return;
        }
        
        for (const [url, info] of Object.entries(data.results)) {
          if ((info as any).exists) {
            const issueNumber = (info as any).issueNumber;
            const isApproved = (info as any).isApproved || false;
            const wishTitle = (info as any).projectTitle || (info as any).title || '';
            
            existingMap[url] = {
              issueUrl: (info as any).issueUrl,
              issueNumber: issueNumber,
              isApproved: isApproved,
              wishTitle: wishTitle,
            };
            approvalMap[issueNumber] = isApproved;
          }
        }
        
        setExistingWishlists(existingMap);
        setWishlistApprovalStatus(approvalMap);
      }
    } catch (err) {
      console.error('Error checking existing wishlists:', err);
    }
  };

  const loadExistingWishlistData = async (issueNumber: number) => {
    try {
      // Use the API endpoint with cache-busting timestamp to get fresh data
      const timestamp = Date.now();
      const apiUrl = getApiPath(`/api/get-wishlist?issueNumber=${issueNumber}&t=${timestamp}`);
      const response = await fetch(apiUrl, {
        cache: 'no-store', // Don't use browser cache
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error('Failed to load cached wishlist data, status:', response.status);
        const text = await response.text();
        console.error('Response body:', text);
        return false;
      }
      
      const cachedData = await response.json();
      
      // Enforce max wishes when loading existing data
      let incomingWishes: string[] = cachedData.wishes || [];
      if (Array.isArray(incomingWishes) && incomingWishes.length > MAX_WISHES) {
        incomingWishes = incomingWishes.slice(0, MAX_WISHES);
        setError(`This wishlist currently has more than ${MAX_WISHES} wishes. We trimmed the selection to the first ${MAX_WISHES}.`);
      }

      // Ensure we have a title from the API response
      const title = cachedData.projectTitle || cachedData.project || cachedData.title || '';
      
      const updatedData = {
        maintainerEmail: cachedData.maintainerEmail || '', // Email included for edit form, can be updated
        projectTitle: title,
        selectedServices: incomingWishes,
        urgency: cachedData.urgency || 'medium',
        projectSize: cachedData.projectSize || 'medium',
        timeline: cachedData.timeline || '',
        organizationType: cachedData.organizationType || 'single-maintainer',
        organizationName: cachedData.organizationName || '',
        otherOrganizationType: cachedData.otherOrganizationType || '',
        additionalNotes: cachedData.additionalNotes || '',
        technologies: cachedData.technologies || [],
        openToSponsorship: cachedData.openToSponsorship ?? false,
        preferredPractitioner: cachedData.preferredPractitioner || '',
        nomineeName: cachedData.nomineeName || '',
        nomineeEmail: cachedData.nomineeEmail || '',
        nomineeGithub: cachedData.nomineeGithub || ''
      };
      
      // Set original services for comparison
      setOriginalServices(incomingWishes);
      
      // Update all form data directly (not using prev callback)
      setWishlistData(updatedData);
      
      // Handle FUNDING.yml checkbox state based on labels
      // If funding-yml-requested label exists, check the box
      // If funding-yml-processed label exists, disable the checkbox
      if (cachedData.wantsFundingYml) {
        setCreateFundingPR(true);
      }
      if (cachedData.fundingYmlProcessed) {
        // We'll handle the disabled state in the JSX based on this flag
        // Store it in a way the component can access
        setFundingYmlProcessed(true);
      }
      
      setIsEditingExisting(true);
      setExistingIssueNumber(issueNumber);
      
      // Set repository data from the cached wishlist so form knows which repo we're editing
      // This is important for the submission to know which repository to submit to
      if (cachedData.repository || cachedData.repositoryUrl) {
        const repoData = {
          name: cachedData.project || cachedData.projectTitle || 'Project',
          description: cachedData.description || '',
          url: cachedData.repositoryUrl || cachedData.repository || '',
          username: cachedData.maintainer || ''
        };
        setManualRepoData(repoData);
      } else {
        console.warn('[loadExistingWishlistData] No repository URL found in cached data:', cachedData);
      }
      
      return true;
      
    } catch (err) {
      console.error('Error loading existing wishlist data:', err);
      return false;
    }
  };

  const checkAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const error = urlParams.get('error');
        
    if (authStatus === 'success') {
      {
        const basePath = getBasePath();
        window.location.href = `${basePath}maintainers`;
      }
    } else if (error) {
      setError(`Authentication failed: ${error.replace('_', ' ')}`);
    }
  };

  const initiateGitHubAuth = () => {
    setLoading(false);
    setError('');
    window.location.href = getApiPath('/api/auth/github');
  };

  const parseProjectUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      
      // Check if it's a GitHub URL to extract more detailed info
      const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
      
      if (githubMatch) {
        const [, username, repoName] = githubMatch;
        return {
          username,
          name: repoName,
          description: 'Repository entered manually',
          url: `https://github.com/${username}/${repoName}`
        };
      }
      
      // For non-GitHub URLs, extract what we can from the URL
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      const projectName = pathParts[pathParts.length - 1] || urlObj.hostname;
      
      return {
        username: urlObj.hostname,
        name: projectName,
        description: 'Project entered manually',
        url: url
      };
    } catch {
      return null;
    }
  };

  // Allow only http and https schemes
  const sanitizeUrl = (url: string | undefined | null): string => {
    if (!url) return "#";
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
        return url;
      }
    } catch {
      // If invalid, fall through below
    }
    return "#";
  };

  const handleManualRepoSubmit = () => {
    setError('');
    const repoData = parseProjectUrl(manualRepoUrl);
    
    if (!repoData) {
      setError('Please enter a valid URL (e.g., https://github.com/username/repository or https://example.com/project)');
      return;
    }
    
    setManualRepoData(repoData);
    setCurrentStep('repo');
  };

  const proceedToWishlist = () => {
    if ((user && selectedRepo) || manualRepoData) {
      setCurrentStep('wishlist');
    }
  };

  /**
   * Real-time validation handler for form fields
   * Validates field and updates validation state with feedback
   */
  const validateField = (fieldName: string, value: string, fieldType: 'email' | 'url' | 'text' | 'notes') => {
    let result: ValidationResult | null = null;

    switch (fieldType) {
      case 'email':
        result = validateEmail(value);
        break;
      case 'url':
        let isGitHubUrl = false;
        try {
          const parsedUrl = new URL(value);
          // Only accept plain github.com (not attacker-controlled or subdomain unless desired)
          isGitHubUrl = parsedUrl.hostname === 'github.com';
        } catch (e) {
          isGitHubUrl = false;
        }
        if (isGitHubUrl) {
          result = validateGitHubUrl(value);
        } else {
          result = validateUrl(value, fieldName);
        }
        break;
      case 'text':
        result = validateLength(value, 1, 200, fieldName);
        if (result.isValid) {
          const profanityCheck = checkProfanity(value);
          result = profanityCheck;
        }
        break;
      case 'notes':
        result = validateLength(value, 0, 1000, fieldName);
        if (result.isValid && value.length > 0) {
          const profanityCheck = checkProfanity(value);
          result = profanityCheck;
        }
        break;
    }

    if (result) {
      setValidationResults(prev => ({
        ...prev,
        [fieldName]: result as ValidationResult
      }));
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    setError('');
    setWishlistData(prev => {
      const isSelected = prev.selectedServices.includes(serviceId);
      if (!isSelected && prev.selectedServices.length >= MAX_WISHES) {
        setError(`You can select up to ${MAX_WISHES} services.`);
        return prev;
      }
      return {
        ...prev,
        selectedServices: isSelected
          ? prev.selectedServices.filter(id => id !== serviceId)
          : [...prev.selectedServices, serviceId]
      };
    });
  };

  const handleSubmitWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous field errors
    setFieldErrors({});
    const invalidFields: string[] = [];
    
    if (!wishlistData.projectTitle.trim()) {
      setError('Please enter a project title');
      invalidFields.push('projectTitle');
    }
    
    if (wishlistData.selectedServices.length === 0) {
      setError('Please select at least one service');
      invalidFields.push('selectedServices');
    }

    if (wishlistData.selectedServices.length > MAX_WISHES) {
      setError(`You can select up to ${MAX_WISHES} services.`);
      invalidFields.push('selectedServices');
    }

    // Require a valid project size selection
    if (!['small', 'medium', 'large'].includes(wishlistData.projectSize)) {
      setError('Please select a project size');
      invalidFields.push('projectSize');
    }

    // Require project description
    if (!wishlistData.additionalNotes.trim()) {
      setError('Please enter a project description');
      invalidFields.push('additionalNotes');
    }

    // If there are validation errors, highlight fields and return
    if (invalidFields.length > 0) {
      highlightInvalidFields(invalidFields);
      return;
    }

    // Basic client-side validation for spam patterns
    const fieldsToCheck = [
      wishlistData.projectTitle,
      wishlistData.organizationName,
      wishlistData.additionalNotes
    ].filter(Boolean).join(' ');

    // Check for excessive URLs
    const urlCount = (fieldsToCheck.match(/https?:\/\//gi) || []).length;
    if (urlCount > 3) {
      setError('Too many URLs detected. Please limit links in your submission.');
      return;
    }

    // Check for excessive capitalization
    if (fieldsToCheck.length > 20) {
      const capsCount = (fieldsToCheck.match(/[A-Z]/g) || []).length;
      const lettersCount = (fieldsToCheck.match(/[a-zA-Z]/g) || []).length;
      if (lettersCount > 0 && capsCount / lettersCount > 0.6) {
        setError('Please avoid excessive capitalization in your submission.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      // Create array of repository info
      const repositories = selectedRepo 
        ? [{
            name: selectedRepo.name,
            url: selectedRepo.html_url,
            username: user?.login || '',
            description: selectedRepo.description || ''
          }]
        : manualRepoData 
          ? [manualRepoData]
          : [];

      if (repositories.length === 0) {
        console.error('Repository information is missing');
        throw new Error('Repository information is missing. Please go back and select or enter a repository.');
      }

      const selectedServiceTitles = wishlistData.selectedServices.map(
        serviceId => availableServices.find(s => s.id === serviceId)?.title || serviceId
      );

      const issueTitle = `Wishlist: ${wishlistData.projectTitle}`;
      
      // Simple issue body format matching what the action expects
      const issueBody = `### Project Name
${wishlistData.projectTitle}

### Maintainer GitHub Username
${repositories[0].username}

### Project Repository
${repositories[0].url}

### FUNDING.yml Setup

- [${createFundingPR ? 'x' : ' '}] Yes, create a FUNDING.yml PR for my repository

**Created:** ${new Date().toISOString()}
**Updated:** ${new Date().toISOString()}
`;

      // Submit directly to our API instead of opening GitHub
      const apiUrl = getApiPath('/api/submit-wishlist');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: ['wishlist', `${wishlistData.urgency}-priority`],
          isUpdate: isEditingExisting,
          ...(existingIssueNumber && { issueNumber: existingIssueNumber }), // Only include if exists
          formData: {
            projectTitle: wishlistData.projectTitle,
            projectUrl: repositories[0].url, // Use first repo as primary
            maintainer: repositories[0].username,
            services: wishlistData.selectedServices,
            projectSize: wishlistData.projectSize,
            technologies: wishlistData.technologies,
            urgency: wishlistData.urgency,
            description: repositories[0].description || '',
            additionalNotes: wishlistData.additionalNotes || '',
            repositories: repositories, // Include all repositories
            createFundingPR: createFundingPR, // Include FUNDING.yml PR flag
            openToSponsorship: wishlistData.openToSponsorship, // Include sponsorship opt-in
            preferredPractitioner: wishlistData.preferredPractitioner,
            nomineeName: wishlistData.nomineeName,
            nomineeEmail: wishlistData.nomineeEmail,
            nomineeGithub: wishlistData.nomineeGithub,
            organizationType: wishlistData.organizationType,
            organizationName: wishlistData.organizationName,
            otherOrganizationType: wishlistData.otherOrganizationType,
            maintainerEmail: wishlistData.maintainerEmail // Include maintainer email for admin notification (stored in database)
          }
        })
      });

      // Clone the response so we can read it multiple times if needed
      const responseClone = response.clone();
      
      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          errorText = await response.text();
        } catch (e) {
          console.error('[WishlistForm] Failed to read error response:', e);
        }
        console.error('[WishlistForm] API error response:', errorText);
        throw new Error(`API error (${response.status}): ${errorText.substring(0, 200)}`);
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('[WishlistForm] Failed to parse JSON response');
        try {
          const responseText = await responseClone.text();
          console.error('[WishlistForm] Response text:', responseText.substring(0, 500));
        } catch (e) {
          console.error('[WishlistForm] Could not read response text');
        }
        throw new Error('Server returned invalid response. Please try again or contact support.');
      }

      if (!result.success) {
        // Handle validation errors with field information
        if (result.field) {
          // Convert technical field names to user-friendly labels
          const fieldLabels: Record<string, string> = {
            'formData.projectTitle': 'Project Title',
            'formData.timeline': 'Timeline',
            'formData.organizationName': 'Organization Name',
            'formData.additionalNotes': 'Project Description',
            'formData.description': 'Project Description',
            'title': 'Title',
            'body': 'Content'
          };
          
          const friendlyFieldName = fieldLabels[result.field] || result.field;
          const errorMessage = `${friendlyFieldName}: ${result.details || result.error}`;
          throw new Error(errorMessage);
        }
        // Include details from moderation failures or other API errors
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}`
          : result.error || 'Failed to create wishlist';
        throw new Error(errorMessage);
      }

      // Success! Store the result (data is now nested under result.data)
      const issueData = result.data;
      
      // Redirect to success page with the updated project title
      const basePath = getBasePath();
      const successUrl = new URL(`${basePath}wishlist-success`, window.location.origin);
      successUrl.searchParams.set('id', issueData.issue.number.toString());
      successUrl.searchParams.set('update', isEditingExisting.toString());
      successUrl.searchParams.set('title', wishlistData.projectTitle);
      
      window.location.href = successUrl.toString();
      
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseWishlist = async (issueNumber: number) => {
    if (!issueNumber) {
      setError('No wishlist to close');
      return;
    }

    const confirmClose = window.confirm(
      `Are you sure you want to close this wishlist (Issue #${issueNumber})? This will mark it as no longer needing help.`
    );

    if (!confirmClose) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(getApiPath('/api/close-wishlist'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issueNumber: issueNumber
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to close wishlist');
      }

      // Remove the closed wishlist from existingWishlists state
      setExistingWishlists(prev => {
        const updated = { ...prev };
        // Find and remove the wishlist by issue number
        Object.keys(updated).forEach(repoUrl => {
          if (updated[repoUrl].issueNumber === issueNumber) {
            delete updated[repoUrl];
          }
        });
        return updated;
      });

      // Show success message
      setSuccess({
        issueNumber: result.issue.number,
        issueUrl: result.issue.url,
        issueTitle: '✅ Wishlist Closed Successfully!',
        isUpdate: false
      });

      // If in edit mode, reset to auth step after showing success
      if (currentStep === 'wishlist') {
        setTimeout(() => {
          setCurrentStep('auth');
          setIsEditingExisting(false);
          setExistingIssueNumber(null);
          setSelectedRepo(null);
          setSuccess(null);
        }, 3000);
      } else {
        // If on repo list, just clear success after 3 seconds
        setTimeout(() => {
          setSuccess(null);
          setExistingIssueNumber(null);
        }, 3000);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close wishlist');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Authentication / Repository Selection
  if (currentStep === 'auth') {
    // If not authenticated, show sign-in prompt
    if (!user && !loadingRepos) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Please sign in with GitHub to create a wishlist. This helps us verify project ownership and prevent spam.
            </p>
            <button
              onClick={initiateGitHubAuth}
              className="inline-flex items-center bg-gray-900 text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-lg"
            >
              <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              Sign in with GitHub
            </button>
            <div className="mt-8 text-sm text-gray-500">
              <h4 className="font-medium text-gray-700 mb-2">Why we require authentication:</h4>
              <ul className="text-left inline-block">
                <li className="flex items-center mb-1">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Verify project ownership
                </li>
                <li className="flex items-center mb-1">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Prevent spam and abuse
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Connect with your GitHub profile
                </li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    // Loading repositories - only show if actually loading AND no repos yet
    if (loadingRepos && repositories.length === 0) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your repositories...</p>
          </div>
        </div>
      );
    }

    // Authenticated user - show repositories and manual entry
    return (
      <div className="max-w-4xl mx-auto">
        {/* Success Message - Enhanced Confirmation Page */}
        {success && (
          <div className="bg-white border-2 border-gray-700 rounded-lg p-8 mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {success.isUpdate ? 'Wishlist Updated!' : 'Wishlist Created!'}
            </h3>
            <p className="text-gray-600 mb-6">
              {success.isUpdate 
                ? 'Your wishlist has been successfully updated.' 
                : 'Your wishlist has been successfully created and is pending approval.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  // Navigate to wishlist detail page
                  const slug = success.issueUrl ? success.issueUrl.split('/').pop() : success.issueNumber;
                  window.location.href = `${getBasePath()}wishlist/${success.issueNumber}`;
                }}
                className="btn-sparkle inline-flex items-center justify-center px-6 py-3"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                <span>View Wishlist</span>
              </button>
              <button
                onClick={() => {
                  // Remove ?edit= parameter from URL
                  if (typeof window !== 'undefined' && window.location.search.includes('edit=')) {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('edit');
                    window.history.replaceState({}, '', url.toString());
                  }
                  
                  // Scroll to top and show the cards
                  setSuccess(null);
                  setIsEditingExisting(false);
                  setExistingIssueNumber(null);
                  setCurrentStep('auth');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn-secondary inline-flex items-center justify-center px-6 py-3"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                <span>Back to Your Wishlists</span>
              </button>
            </div>
          </div>
        )}

        {/* Only show the form if NOT showing success message */}
        {!success && (
          <>
        {/* Repositories Section */}
        <div className="bg-white p-8 rounded-lg shadow-sm border mb-8">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Select a Repository</h3>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
              {repositories
                .filter((repo) => !existingWishlists[repo.html_url]) // Filter out repos with existing wishlists
                .map((repo) => {
                const isSelected = selectedRepo?.id === repo.id;
                const hasExistingWishlist = existingWishlists[repo.html_url];

                return (
                  <div
                    key={repo.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedRepo(null);
                        setSelectedAction(null);
                      } else {
                        setSelectedRepo(repo);
                        // If no wishlist, default to create action
                        if (!hasExistingWishlist) {
                          setSelectedAction('create');
                        } else {
                          // Reset action when selecting a repo with existing wishlist
                          setSelectedAction(null);
                        }
                      }
                    }}
                    className={`w-full text-left p-4 border rounded-lg transition-colors cursor-pointer ${
                      isSelected ? 'border-gray-900 bg-gray-100' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{repo.name}</h4>
                            {hasExistingWishlist && hasExistingWishlist.wishTitle && (
                              <p className="text-sm text-gray-600 mt-1">
                                <span className="font-bold">Wishlist Title:</span> {hasExistingWishlist.wishTitle}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {hasExistingWishlist ? (
                              <>
                                {hasExistingWishlist.isApproved ? (
                                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-1 shrink-0">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    Approved
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-300 flex items-center gap-1 shrink-0">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Pending
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRepo(repo);
                                    setSelectedAction('edit');
                                  }}
                                  className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 shrink-0 ${
                                    isSelected && selectedAction === 'edit'
                                      ? 'bg-gray-200 text-gray-900 border-gray-400'
                                      : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                                  }`}
                                >
                                  <PencilIcon />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRepo(repo);
                                    setSelectedAction('close');
                                  }}
                                  className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 shrink-0 ${
                                    isSelected && selectedAction === 'close'
                                      ? 'bg-gray-300 text-gray-900 border-gray-500'
                                      : 'bg-gray-200 text-gray-800 border-gray-400 hover:bg-gray-300'
                                  }`}
                                  title="Close this wishlist"
                                >
                                  <TrashIcon />
                                  <span>Close</span>
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                        {repo.description && <p className="text-sm text-gray-600 mt-1">{repo.description}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          {repo.language && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{repo.language}</span>}
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <StarIcon />
                            {repo.stargazers_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {repositories.filter((repo) => !existingWishlists[repo.html_url]).length === 0 && repositories.length > 0 && (
                <div className="col-span-full text-center py-8 text-gray-600">
                  <p className="text-sm">All your repositories already have wishlists!</p>
                  <p className="text-xs text-gray-500 mt-1">You can edit or close them using your wishlist cards above.</p>
                </div>
              )}
            </div>

            {selectedRepo && selectedAction && (
              <button
                onClick={async () => {
                  const hasExisting = selectedRepo && existingWishlists[selectedRepo.html_url];

                  if (selectedAction === 'close') {
                    if (hasExisting) {
                      await handleCloseWishlist(hasExisting.issueNumber);
                    }
                  } else if (selectedAction === 'edit') {
                    if (hasExisting) {
                      setLoading(true);
                      setError('');
                      setIsEditingExisting(true);
                      setExistingIssueNumber(hasExisting.issueNumber);
                      const success = await loadExistingWishlistData(hasExisting.issueNumber);
                      setLoading(false);
                      if (success) {
                        setCurrentStep('wishlist');
                      } else {
                        setError('Failed to load wishlist data. Please try again.');
                      }
                    }
                  } else if (selectedAction === 'create') {
                    setIsEditingExisting(false);
                    setExistingIssueNumber(null);
                    setCurrentStep('wishlist');
                  }
                }}
                disabled={loading}
                className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </span>
                ) : selectedAction === 'close' ? (
                  'Continue to Close Wishlist'
                ) : selectedAction === 'edit' ? (
                  'Continue to Edit Wishlist'
                ) : (
                  'Continue with Repository'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Manual Entry Form */}
        <div className="bg-white p-8 rounded-lg shadow-sm border mb-8">
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
              {repositories.length > 0 ? 'Or, enter your project URL manually' : 'Enter Project URL'}
            </h3>
            <p className="text-gray-600 text-sm mb-4 text-center">
              This can be anywhere.
            </p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="repo-url" className="block text-sm font-medium text-gray-700 mb-2">
                  Project URL
                </label>
                  <input
                    id="repo-url"
                    type="url"
                    value={manualRepoUrl}
                    onChange={(e) => setManualRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleManualRepoSubmit}
                    disabled={!manualRepoUrl.trim()}
                    className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400"
                  >
                    Continue
                  </button>
                </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    );
  }

  // Step 2: Repository Selection/Confirmation
  if (currentStep === 'repo') {
    // Show manual repo confirmation OR selected repos from OAuth
    if (manualRepoData || selectedRepo) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                Confirm Project Details
              </h3>
              
              {manualRepoData && (
                <div className="bg-gray-50 border rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900">{manualRepoData.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{manualRepoData.description}</p>
                  <p className="text-sm text-gray-700 underline mt-2">{manualRepoData.url}</p>
                  <p className="text-sm text-gray-500 mt-2">Maintainer: @{manualRepoData.username}</p>
                </div>
              )}
              
              {selectedRepo && (
                <div className="space-y-3 mb-6">
                  <p className="text-sm text-gray-600 text-center mb-3">
                    Repository selected
                  </p>
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900">{selectedRepo.name}</h4>
                    {selectedRepo.description && (
                      <p className="text-sm text-gray-600 mt-1">{selectedRepo.description}</p>
                    )}
                    <p className="text-sm text-gray-700 underline mt-2">{selectedRepo.html_url}</p>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={proceedToWishlist}
                  className="flex-1 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 flex items-center justify-center gap-2"
                >
                  {isEditingExisting ? (
                    <>
                      <PencilIcon />
                      <span>Update Wishlist</span>
                    </>
                  ) : (
                    <>
                      <RocketIcon />
                      <span>Create Wishlist</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setManualRepoData(null);
                    setManualRepoUrl('');
                    setSelectedRepo(null);
                    setCurrentStep('auth');
                  }}
                  className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // OAuth repository selection (simplified for now)
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-sm border">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Repository Selection</h3>
            <p className="text-gray-600 mb-6">OAuth authentication is in progress...</p>
            <button
              onClick={() => setCurrentStep('auth')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Wishlist Creation Form
  if (currentStep === 'wishlist') {
    // Since we redirect on success, we should never show success page here anymore
    // This entire success block can be removed, but keeping for safety
    if (success) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                <svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {success.isUpdate ? 'Wishlist Updated Successfully!' : 'Wishlist Created Successfully!'}
              </h3>
              <p className="text-gray-600 mb-6">
                {success.isUpdate 
                  ? 'Your wishlist has been updated successfully.'
                  : 'Your wishlist has been created and is now visible to the community.'
                }
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">{success.issueTitle}</h4>
                <p className="text-sm text-gray-600">
                  Your wishlist is now visible to potential contributors and supporters.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={withBasePath(`wishlist/${success.issueNumber}`)}
                  className="btn-sparkle inline-flex items-center justify-center px-6 py-3"
                  onClick={() => {
                    // Clear persisted success state when navigating away
                    if (typeof sessionStorage !== 'undefined') {
                      sessionStorage.removeItem('wishlist_success');
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                  View Wishlist
                </a>
                <button
                  onClick={() => {
                    // Clear persisted success state
                    if (typeof sessionStorage !== 'undefined') {
                      sessionStorage.removeItem('wishlist_success');
                    }
                    
                    // Remove ?edit= parameter from URL
                    if (typeof window !== 'undefined' && window.location.search.includes('edit=')) {
                      const url = new URL(window.location.href);
                      url.searchParams.delete('edit');
                      window.history.replaceState({}, '', url.toString());
                    }
                    
                    // Scroll to top and show the cards
                    setSuccess(null);
                    setIsEditingExisting(false);
                    setExistingIssueNumber(null);
                    setCurrentStep('auth');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="btn-secondary inline-flex items-center justify-center px-6 py-3"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                  </svg>
                  <span>Back to Your Wishlists</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmitWishlist} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* ========== SECTION 1: MAINTAINER INFO ========== */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              About You (The Maintainer)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Tell us about you and your team. This helps us coordinate fulfillment.
            </p>
            
            {/* Maintainer Email */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="maintainerEmail"
                id="maintainerEmail"
                value={wishlistData.maintainerEmail}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setWishlistData(prev => ({ ...prev, maintainerEmail: newValue }));
                  clearFieldError('maintainerEmail');
                  validateField('maintainerEmail', newValue, 'email');
                }}
                onBlur={(e) => {
                  validateField('maintainerEmail', e.target.value, 'email');
                }}
                placeholder="your.email@example.com"
                className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent ${getFieldBorderClass('maintainerEmail')}`}
                required
              />
              {validationResults.maintainerEmail && (
                <ValidationFeedback
                  label="Email Address"
                  value={wishlistData.maintainerEmail}
                  isValid={validationResults.maintainerEmail.isValid}
                  validationResult={validationResults.maintainerEmail}
                />
              )}
              {fieldErrors.maintainerEmail && (
                <p className="text-red-600 text-sm mt-1">{fieldErrors.maintainerEmail}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                This email is NOT saved to your public wishlist. We'll use it only for coordination and follow-up.
              </p>
            </div>

            {/* Organization Type */}
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Who owns/runs this project?
                </label>
                <select
                  value={wishlistData.organizationType}
                  onChange={(e) => setWishlistData(prev => ({ ...prev, organizationType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="single-maintainer">Single maintainer</option>
                  <option value="community-team">Community team</option>
                  <option value="company-team">Company/employee team</option>
                  <option value="foundation-team">Foundation/employee team</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {wishlistData.organizationType === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Please specify
                  </label>
                  <input
                    type="text"
                    value={wishlistData.otherOrganizationType}
                    onChange={(e) => setWishlistData(prev => ({ ...prev, otherOrganizationType: e.target.value }))}
                    placeholder="Describe ownership structure"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
              )}

              {(wishlistData.organizationType === 'company-team' || wishlistData.organizationType === 'foundation-team') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={wishlistData.organizationName}
                    onChange={(e) => setWishlistData(prev => ({ ...prev, organizationName: e.target.value }))}
                    placeholder="Enter organization name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Honorarium Opt-in */}
            <div className="mt-6">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={wishlistData.openToSponsorship}
                  onChange={(e) => setWishlistData(prev => ({ ...prev, openToSponsorship: e.target.checked }))}
                  className="mt-1 h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  I/we are open to receiving an honorarium as part of wish fulfillment
                  <span className="block text-xs text-gray-500 mt-1">
                    Organizations fulfilling your wish may offer an optional honorarium to recognize your time and collaboration (not payment for services or obligation)
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* ========== SECTION 2: PROJECT INFO ========== */}
          {/* Project Details */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClockIcon />
              <span>Project Details</span>
            </h3>
            
            {/* Selected Repository Info */}
            {(selectedRepo || manualRepoData) && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Repository:</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedRepo ? selectedRepo.name : manualRepoData?.name}
                </p>
                <a 
                  href={selectedRepo ? sanitizeUrl(selectedRepo.html_url) : sanitizeUrl(manualRepoData?.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {selectedRepo ? selectedRepo.html_url : manualRepoData?.url}
                </a>
              </div>
            )}
            
            {/* Project Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="projectTitle"
                id="projectTitle"
                value={wishlistData.projectTitle}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setWishlistData(prev => ({ ...prev, projectTitle: newValue }));
                  clearFieldError('projectTitle');
                  validateField('projectTitle', newValue, 'text');
                }}
                onBlur={(e) => {
                  validateField('projectTitle', e.target.value, 'text');
                }}
                placeholder="Enter your project title (e.g., 'My Awesome Library')"
                className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent ${getFieldBorderClass('projectTitle')}`}
                required
              />
              {validationResults.projectTitle && (
                <ValidationFeedback
                  label="Project Title"
                  value={wishlistData.projectTitle}
                  isValid={validationResults.projectTitle.isValid}
                  validationResult={validationResults.projectTitle}
                />
              )}
              {fieldErrors.projectTitle && (
                <p className="text-red-600 text-sm mt-1">{fieldErrors.projectTitle}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                This will be the main title for your wishlist and how people will identify and triage your project or projects
              </p>
            </div>

            {/* Project Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Description <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-2">
                This is your chance to motivate sponsors and helpers to get involved. Tell them why your project matters and what impact their help could have.
              </p>
              <textarea
                value={wishlistData.additionalNotes}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setWishlistData(prev => ({ ...prev, additionalNotes: newValue }));
                  validateField('additionalNotes', newValue, 'notes');
                }}
                onBlur={(e) => {
                  validateField('additionalNotes', e.target.value, 'notes');
                }}
                rows={4}
                placeholder="Describe your project, its impact, and why this help would matter..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              {validationResults.additionalNotes && (
                <ValidationFeedback
                  label="Project Description"
                  value={wishlistData.additionalNotes}
                  isValid={validationResults.additionalNotes.isValid}
                  validationResult={validationResults.additionalNotes}
                  helpText={`${wishlistData.additionalNotes.length}/1000`}
                />
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Size <span className="text-red-600">*</span>
                </label>
                <select
                  value={wishlistData.projectSize}
                  onChange={(e) => setWishlistData(prev => ({ ...prev, projectSize: e.target.value as any }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Not sure? See our <a className="underline hover:text-gray-900" href={`${getBasePath()}faq#project-size-guidance`} target="_blank" rel="noopener noreferrer">sizing guidance</a>.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency
                </label>
                <select
                  value={wishlistData.urgency}
                  onChange={(e) => setWishlistData(prev => ({ ...prev, urgency: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="low">Low - Flexible timeline</option>
                  <option value="medium">Medium - Preferred timeline</option>
                  <option value="high">High - Urgent need</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeline
                </label>
                <input
                  type="text"
                  value={wishlistData.timeline}
                  onChange={(e) => setWishlistData(prev => ({ ...prev, timeline: e.target.value }))}
                  placeholder="e.g., 'Within 3 months', 'Q1 2024', 'Flexible'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Package Ecosystems */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Package Ecosystem
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select up to 2 package managers/ecosystems your project publishes to. This helps practitioners find projects in ecosystems they specialize in.
            </p>
            
            {/* Package ecosystem buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {SUPPORTED_ECOSYSTEMS.map((ecosystem) => {
                const isSelected = wishlistData.technologies.includes(ecosystem);
                const isDisabled = !isSelected && wishlistData.technologies.length >= 2;
                return (
                  <button
                    key={ecosystem}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      setWishlistData(prev => ({
                        ...prev,
                        technologies: isSelected 
                          ? prev.technologies.filter(t => t !== ecosystem)
                          : [...prev.technologies, ecosystem]
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-gray-700 text-white'
                        : isDisabled
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {ecosystem}
                  </button>
                );
              })}
            </div>

            {/* Custom ecosystem input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add custom ecosystem (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g., Conda (Python), Homebrew (macOS), vcpkg (C++)"
                disabled={wishlistData.technologies.length >= 2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.currentTarget;
                    const value = input.value.trim();
                    if (value && wishlistData.technologies.length < 2) {
                      const newEcosystems = value.split(',').map(t => t.trim()).filter(t => t && !wishlistData.technologies.includes(t));
                      // Only add up to the 2-item limit
                      const availableSlots = 2 - wishlistData.technologies.length;
                      const ecosystemsToAdd = newEcosystems.slice(0, availableSlots);
                      if (ecosystemsToAdd.length > 0) {
                        setWishlistData(prev => ({
                          ...prev,
                          technologies: [...prev.technologies, ...ecosystemsToAdd]
                        }));
                        input.value = '';
                      }
                    }
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Press Enter to add. Use this for ecosystems not listed above. {wishlistData.technologies.length >= 2 && '(Maximum 2 ecosystems reached)'}
              </p>
            </div>

            {/* Selected ecosystems display */}
            {wishlistData.technologies.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected ecosystems:</p>
                <div className="flex flex-wrap gap-2">
                  {wishlistData.technologies.map((ecosystem) => (
                    <span
                      key={ecosystem}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-700 text-white rounded-lg text-sm"
                    >
                      {ecosystem}
                      <button
                        type="button"
                        onClick={() => {
                          setWishlistData(prev => ({
                            ...prev,
                            technologies: prev.technologies.filter(t => t !== ecosystem)
                          }));
                        }}
                        className="hover:text-gray-300"
                        aria-label={`Remove ${ecosystem} tag`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ========== SECTION 3: SERVICES ========== */}
          {/* Services Selection */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Services Needed <span className="text-red-500">*</span>
            </h3>
            <p className="text-sm mb-3">
              <span className={`font-medium ${wishlistData.selectedServices.length >= MAX_WISHES ? 'text-red-700' : 'text-gray-600'}`}>
                Select up to {MAX_WISHES} services
              </span>
              <span className="text-gray-500"> — {wishlistData.selectedServices.length} selected</span>
            </p>
            {isEditingExisting && originalServices.length > 0 && (
              <p className="text-sm text-gray-600 mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <span className="font-medium">Currently selected services</span> are highlighted. You can modify your selection below.
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {availableServices.map((service) => {
                const isSelected = wishlistData.selectedServices.includes(service.id);
                const reachedMax = wishlistData.selectedServices.length >= MAX_WISHES;
                const wasOriginallySelected = originalServices.includes(service.id);
                // Availability is controlled only by service frontmatter
                const notAvailable = service.available === false;
                
                return (
                  <div
                    key={service.id}
                    onClick={() => handleServiceToggle(service.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-gray-900 bg-gray-100'
                        : reachedMax
                          ? 'border-gray-200 opacity-60 cursor-not-allowed'
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{service.title}</h4>
                          {wasOriginallySelected && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-300 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                              Currently selected
                            </span>
                          )}
                          {notAvailable && (
                            <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded border border-gray-400">
                              Currently Unavailable
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        {notAvailable && (
                          <p className="text-xs text-gray-700 mt-2">
                            You can still select this. We’ll add you to our waitlist for this service and notify you when a practitioner is available.{' '}
                            <a
                              href={`${getBasePath()}faq#service-availability-waitlist`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-gray-800 hover:text-gray-900"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Learn more
                            </a>
                            .
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {service.category && (
                            <span className="inline-block bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                              {service.category}
                            </span>
                          )}
                          {service.slug && (
                            <a
                              href={`${getBasePath()}services/${service.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-700 hover:text-gray-900 underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Learn more →
                            </a>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-2 text-gray-900 text-lg">✓</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-xs text-gray-600">
              Note: Services marked “Currently Unavailable” can still be selected. We’ll place you on our waitlist and follow up as soon as capacity opens.{' '}
              <a href={`${getBasePath()}faq#service-availability-waitlist`} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">Learn more</a>.
            </div>
          </div>

          {/* FUNDING.yml Checkbox (GitHub-only feature) */}
          {/* Only show for GitHub-authenticated users with GitHub-sourced repositories */}
          {(!initialUser?.provider || initialUser.provider === 'github') && !manualRepoData && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className={`p-4 rounded-lg border ${fundingYmlProcessed ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200'}`}>
                <label className={`flex items-start space-x-3 ${fundingYmlProcessed ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={createFundingPR && !fundingYmlProcessed}
                    onChange={(e) => setCreateFundingPR(e.target.checked)}
                    disabled={fundingYmlProcessed}
                    className="mt-0.5 h-5 w-5 text-gray-900 border-gray-300 rounded focus:ring-gray-500 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <span className="text-gray-900 font-medium text-sm">Create a PR to add FUNDING.yml to this repository</span>
                    <p className="text-xs text-gray-600 mt-1">
                      {fundingYmlProcessed 
                        ? 'FUNDING.yml PR has already been created for this repository'
                        : 'Automatically submit a pull request to add GitHub Sponsors funding information to your repo'
                      }
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ========== SECTION 4: WHO SHOULD DO THE WORK ========== */}
          {/* Helper Preferences and Nomination */}
          {practitioners && practitioners.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Helper Preferences (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                You can select a preferred helper or nominate someone from your community. 
                Preferences are considered but not guaranteed.{' '}
                <a 
                  href={`${getBasePath()}faq#practitioner-preferences`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-900"
                >
                  Learn more
                </a>
              </p>

              {/* Preferred Practitioner (single select) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Practitioner
                </label>
                <select
                  value={wishlistData.preferredPractitioner}
                  onChange={(e) => setWishlistData(prev => ({ ...prev, preferredPractitioner: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="">No preference</option>
                  {practitioners.map(p => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} {p.github && `(@${p.github})`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a practitioner you'd prefer to work with from our directory.
                </p>
              </div>

              {/* Nominate a Practitioner */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Or nominate someone from your community</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Nominee Name</label>
                    <input
                      type="text"
                      value={wishlistData.nomineeName}
                      onChange={(e) => setWishlistData(prev => ({ ...prev, nomineeName: e.target.value }))}
                      placeholder="Full name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Nominee Email</label>
                    <input
                      type="email"
                      value={wishlistData.nomineeEmail}
                      onChange={(e) => setWishlistData(prev => ({ ...prev, nomineeEmail: e.target.value }))}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Nominee GitHub Profile URL</label>
                    <input
                      type="url"
                      value={wishlistData.nomineeGithub}
                      onChange={(e) => setWishlistData(prev => ({ ...prev, nomineeGithub: e.target.value }))}
                      placeholder="https://github.com/username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Nominees will be vetted against our practitioner criteria before they can fulfill wishes.
                </p>
              </div>
            </div>
          )}

          {/* ========== SUBMIT SECTION ========== */}
          {/* Submit */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            
            {/* Wishlist maintenance reminder acknowledgment */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={acknowledgeReminders}
                  onChange={(e) => setAcknowledgeReminders(e.target.checked)}
                  className="mt-1 h-5 w-5 text-gray-900 border-gray-300 rounded focus:ring-gray-500"
                />
                <div className="flex-1">
                  <span className="text-gray-900 font-medium text-sm">I understand wishlist maintenance requirements</span>
                  <p className="text-xs text-gray-600 mt-1">
                    I understand that I will receive periodic reminders (every 3 months) to validate that my wishlist is still current. Failure to respond to these reminders may result in my wishlist being deactivated.
                  </p>
                </div>
              </label>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button
                type="button"
                onClick={() => setCurrentStep('repo')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors order-2 sm:order-1"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  wishlistData.selectedServices.length === 0 ||
                  wishlistData.selectedServices.length > MAX_WISHES ||
                  !wishlistData.projectTitle.trim() ||
                  (!isEditingExisting && !wishlistData.maintainerEmail.trim()) ||
                  !acknowledgeReminders
                }
                className="flex-1 px-8 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 order-1 sm:order-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>{isEditingExisting ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    {isEditingExisting ? (
                      <>
                        <PencilIcon />
                        <span>Update Wishlist</span>
                      </>
                    ) : (
                      <>
                        <RocketIcon />
                        <span>Create Wishlist</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              {isEditingExisting 
                ? `This will update the existing wishlist (Issue #${existingIssueNumber})` 
                : 'This will create a GitHub issue with your wishlist details'
              }
            </p>
          </div>
        </form>
      </div>
    );
  }

  return null;
};

export default WishlistForm;
/**
 * API endpoint to fetch approved practitioners from database
 */
import type { APIRoute } from 'astro';
import { getApprovedPractitioners } from '../../lib/db.js';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    console.log('[practitioners] Fetching from database');
    
    // Load approved practitioners from database
    const dbPractitioners = await getApprovedPractitioners();
    
    // Map to API format
    const practitioners = dbPractitioners.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      title: p.title,
      company: p.company || '',
      bio: p.bio,
      avatar_url: p.avatar_url || `https://github.com/${p.github}.png`,
      location: p.location || '',
      languages: p.languages,
      email: p.email,
      website: p.website,
      github: p.github,
      github_sponsors: p.github_sponsors,
      mastodon: p.mastodon,
      linkedin: p.linkedin,
      services: p.services,
      availability: p.availability,
      accepts_pro_bono: p.accepts_pro_bono,
      pro_bono_criteria: p.pro_bono_criteria,
      pro_bono_hours_per_month: p.pro_bono_hours_per_month,
      years_experience: p.years_experience,
      notable_experience: p.notable_experience || [],
      certifications: p.certifications || [],
      verified: p.verified,
      created_at: p.created_at.toISOString(),
      updated_at: p.updated_at.toISOString(),
    }));
    
    console.log(`[practitioners] Loaded ${practitioners.length} approved practitioners from database`);

    return new Response(JSON.stringify({
      practitioners,
      metadata: {
        total: practitioners.length,
        approved: practitioners.length,
        source: 'database',
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[practitioners] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

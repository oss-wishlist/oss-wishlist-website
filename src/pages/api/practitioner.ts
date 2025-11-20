/**
 * API endpoint to get a single practitioner by ID or slug
 */
import type { APIRoute } from 'astro';
import { getPractitionerById, getPractitionerBySlug } from '../../lib/db.js';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    const slug = url.searchParams.get('slug');
    
    if (!id && !slug) {
      return new Response(JSON.stringify({ 
        error: 'Practitioner ID or slug is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let practitioner = null;
    
    if (id) {
      const practitionerId = parseInt(id, 10);
      if (isNaN(practitionerId)) {
        return new Response(JSON.stringify({ error: 'Invalid practitioner ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      practitioner = await getPractitionerById(practitionerId);
    } else if (slug) {
      practitioner = await getPractitionerBySlug(slug);
    }
    
    if (!practitioner) {
      console.log(`[practitioner] Practitioner not found - id: ${id}, slug: ${slug}`);
      return new Response(JSON.stringify({ error: 'Practitioner not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[practitioner] Fetched practitioner #${practitioner.id} from database`);

    const response = {
      practitioner: {
        id: practitioner.id,
        slug: practitioner.slug,
        name: practitioner.name,
        title: practitioner.title,
        company: practitioner.company || '',
        bio: practitioner.bio,
        // Use local logo to avoid cross-site cookie errors with GitHub images
        avatar_url: '/images/oss-wishlist-logo.jpg',
        location: practitioner.location || '',
        languages: practitioner.languages,
        email: practitioner.email,
        website: practitioner.website,
        github: practitioner.github,
        github_sponsors: practitioner.github_sponsors,
        mastodon: practitioner.mastodon,
        linkedin: practitioner.linkedin,
        services: practitioner.services,
        availability: practitioner.availability,
        accepts_pro_bono: practitioner.accepts_pro_bono,
        pro_bono_criteria: practitioner.pro_bono_criteria,
        pro_bono_hours_per_month: practitioner.pro_bono_hours_per_month,
        years_experience: practitioner.years_experience,
        notable_experience: practitioner.notable_experience || [],
        certifications: practitioner.certifications || [],
        approved: practitioner.approved,
        verified: practitioner.verified,
        submitter_username: practitioner.submitter_username,
        created_at: practitioner.created_at.toISOString(),
        updated_at: practitioner.updated_at.toISOString(),
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
    });
  } catch (err) {
    console.error('[practitioner] Error:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: err instanceof Error ? err.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

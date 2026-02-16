import type { APIRoute } from 'astro';

// Luma provides a JSON API for calendar events
const LUMA_API_URL = 'https://api.lu.ma/public/v1/calendar/get-items';
const LUMA_CALENDAR_ID = 'cal-UKTU3T5iJaB28YN';

export const prerender = false;

interface LumaEvent {
  api_id: string;
  event: {
    name: string;
    start_at: string;
    end_at: string;
    url: string;
    cover_url?: string;
    description?: string;
  };
}

export const GET: APIRoute = async () => {
  try {
    console.log('Fetching Luma events for calendar:', LUMA_CALENDAR_ID);
    
    // Try Luma's API endpoint
    const response = await fetch(`${LUMA_API_URL}?calendar_api_id=${LUMA_CALENDAR_ID}&limit=10`);
    
    if (!response.ok) {
      console.error(`Luma API failed: ${response.status} ${response.statusText}`);
      // Fall back to empty events
      return new Response(
        JSON.stringify({
          success: true,
          events: [],
          message: 'Unable to fetch events at this time'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300'
          }
        }
      );
    }
    
    const data = await response.json();
    console.log('Luma API response:', data);
    
    const now = new Date();
    const upcomingEvents = (data.entries || [])
      .filter((entry: LumaEvent) => {
        const eventDate = new Date(entry.event.start_at);
        return eventDate >= now;
      })
      .slice(0, 3)
      .map((entry: LumaEvent) => ({
        title: entry.event.name,
        startDate: entry.event.start_at,
        endDate: entry.event.end_at,
        url: entry.event.url,
        description: entry.event.description,
        coverUrl: entry.event.cover_url
      }));
    
    console.log(`Returning ${upcomingEvents.length} upcoming events`);
    
    return new Response(
      JSON.stringify({
        success: true,
        events: upcomingEvents
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching Luma events:', error);
    
    return new Response(
      JSON.stringify({
        success: true,
        events: [],
        error: 'Unable to fetch events'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};

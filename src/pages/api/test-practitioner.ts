import type { APIRoute } from 'astro';

// Deprecated temporary debug endpoint; returns 410 Gone
export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ 
    success: false, 
    error: 'This endpoint has been removed.'
  }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async () => {
  return new Response(JSON.stringify({ 
    success: false, 
    error: 'This endpoint has been removed.'
  }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' }
  });
};

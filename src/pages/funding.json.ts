import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

export const GET: APIRoute = async () => {
  try {
    const fundingPath = path.join(process.cwd(), 'public', 'funding.json');
    const fundingData = fs.readFileSync(fundingPath, 'utf-8');
    
    return new Response(fundingData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Funding data not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

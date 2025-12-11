import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 20, offset = 0 } = await req.json();
    
    const GIPHY_API_KEY = Deno.env.get('GIPHY_API_KEY');
    if (!GIPHY_API_KEY) {
      console.error('GIPHY_API_KEY not configured');
      throw new Error('GIPHY_API_KEY is not configured');
    }

    let url: string;
    
    if (query && query.trim()) {
      // Search GIFs
      url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=pg-13&lang=en`;
    } else {
      // Get trending GIFs
      url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&offset=${offset}&rating=pg-13`;
    }

    console.log('Fetching GIFs from GIPHY:', query ? `Search: ${query}` : 'Trending');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('GIPHY API error:', response.status, await response.text());
      throw new Error(`GIPHY API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the response to only include what we need
    const gifs = data.data.map((gif: any) => ({
      id: gif.id,
      title: gif.title,
      url: gif.images.fixed_height.url,
      preview: gif.images.fixed_height_small.url,
      width: gif.images.fixed_height.width,
      height: gif.images.fixed_height.height,
    }));

    console.log(`Returning ${gifs.length} GIFs`);

    return new Response(JSON.stringify({ gifs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in giphy-search function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

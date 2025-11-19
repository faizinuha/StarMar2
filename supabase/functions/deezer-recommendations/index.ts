// @ts-ignore: Deno deploy global
const serve = Deno.serve || ((handler: any) => {
  console.log('Fallback serve');
});

// Fungsi untuk menangani CORS
function handleCors() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return handleCors();
  }

  try {
    // Dapatkan parameter paginasi dari body, dengan nilai default
    const { index = 0, limit = 15 } = req.method === 'POST' ? await req.json() : {};

    // Panggil Deezer API dengan parameter paginasi
    const url = `https://api.deezer.com/chart/0/tracks?index=${index}&limit=${limit}`;
    const res = await fetch(url);
    
    // Periksa apakah respons dari Deezer API sukses
    if (!res.ok) {
      throw new Error(`Deezer API responded with status: ${res.status}`);
    }

    const json = await res.json();

    // Pastikan data yang diterima memiliki format yang diharapkan
    if (!json || !json.data || !Array.isArray(json.data)) {
        throw new Error("Invalid data structure received from Deezer API");
    }

    // Olah data, pastikan semua properti yang dibutuhkan ada
    const tracks = json.data.map((t: any) => ({
      id: t.id.toString(),
      name: t.title || "Unknown Title",
      artist: t.artist?.name || "Unknown Artist",
      album_title: t.album?.title || "Unknown Album",
      image_url: t.album?.cover_big || "",
      preview: t.preview || null, // Ambil URL preview untuk audio
    }));

    // Kembalikan data yang sudah diolah beserta total lagu
    return new Response(JSON.stringify({ 
      tracks,
      total: json.total || 0,
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    // Tangani error dengan lebih informatif
    return new Response(JSON.stringify({
      error: err?.message || 'Unknown error',
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});

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
    // Ambil trackId dari body request
    const body = await req.json();
    const trackId = body.trackId;

    if (!trackId) {
      throw new Error("trackId is required in the request body");
    }

    // Panggil Deezer API untuk mendapatkan detail lagu
    const res = await fetch(`https://api.deezer.com/track/${trackId}`);

    // Periksa apakah respons dari Deezer API sukses
    if (!res.ok) {
      throw new Error(`Deezer API responded with status: ${res.status}`);
    }
    
    const t = await res.json();

    // Periksa jika lagu tidak ditemukan atau ada error dari Deezer
    if (t.error) {
        throw new Error(`Deezer API error: ${t.error.message}`);
    }

    // Olah data, pastikan semua properti yang dibutuhkan ada
    const track = {
      id: t.id.toString(),
      name: t.title || "Unknown Title",
      artist: t.artist?.name || "Unknown Artist",
      album_title: t.album?.title || "Unknown Album",
      image_url: t.album?.cover_xl || t.album?.cover_big || "",
      preview: t.preview || null, // Ambil URL preview untuk audio
    };

    // Kembalikan data yang sudah diolah
    return new Response(JSON.stringify(track), { // Kembalikan objek track langsung
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    // Tangani error dengan lebih informatif
    return new Response(JSON.stringify({
      error: err.message,
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});

import { supabase } from "@/integrations/supabase/client";

// Antarmuka ini sekarang cocok dengan data yang dikembalikan oleh Supabase Functions
export interface Track {
  id: string;
  name: string;
  artist: string;
  album_title: string;
  image_url: string;
  preview: string | null;
  // Properti ini bisa ditambahkan untuk kompatibilitas, tapi preview lebih utama
  music_url?: string | null;
  audio?: string | null;
}


/**
 * Mengambil detail satu lagu dari Deezer menggunakan Supabase Edge Function.
 * Data yang kembali sudah bersih dan siap pakai.
 * @param {string} trackId - ID lagu dari Deezer.
 * @returns {Promise<Track>}
 */
export async function getTrackById(trackId: string): Promise<Track> {
  const { data, error } = await supabase.functions.invoke('deezer-track-by-id', {
    body: { trackId: trackId },
  });

  if (error) {
    console.error("Error invoking deezer-track-by-id function:", error);
    throw new Error(`Edge Function returned an error: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from edge function");
  }

  // Data sudah dalam format Track, tambahkan properti lain jika perlu
  return {
    ...data,
    music_url: data.preview,
    audio: data.preview,
  };
}

/**
 * Mengambil rekomendasi lagu dari Deezer menggunakan Supabase Edge Function.
 * Data yang kembali sudah bersih dan siap pakai.
 * @returns {Promise<{tracks: Track[], total: number}>}
 */
export async function getRecommendations({ index = 0, limit = 15 }: { index?: number, limit?: number } = {}): Promise<{tracks: Track[], total: number}> {
    const { data, error } = await supabase.functions.invoke('deezer-recommendations', {
        body: { index, limit }
    });

    if (error) {
        console.error('Error invoking deezer-recommendations function:', error);
        throw new Error(`Could not fetch recommendations: ${error.message}`);
    }

    // Fungsi edge mengembalikan objek { tracks: [...], total: ... }
    const tracksData = data.tracks || [];
    const total = data.total || 0;

    // Setiap item sudah dalam format Track, tambahkan properti lain jika perlu
    const formattedTracks = tracksData.map((track: Omit<Track, 'music_url' | 'audio'>) => ({
        ...track,
        music_url: track.preview,
        audio: track.preview,
    }));

    return { tracks: formattedTracks, total };
}

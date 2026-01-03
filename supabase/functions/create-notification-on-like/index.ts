import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Definisikan tipe untuk data yang masuk
interface LikePayload {
  post_id: string;
  liker_id: string; // ID pengguna yang memberikan like
}

serve(async (req) => {
  // Tangani preflight request untuk CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { post_id, liker_id }: LikePayload = await req.json();

    if (!post_id || !liker_id) {
      return new Response(JSON.stringify({ error: 'post_id and liker_id are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Buat Supabase client dengan service_role key untuk hak akses penuh
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Dapatkan ID penulis postingan (post_author_id)
    const { data: postData, error: postError } = await supabaseAdmin
      .from('posts')
      .select('user_id')
      .eq('id', post_id)
      .single();

    if (postError) throw new Error(`Failed to fetch post: ${postError.message}`);
    if (!postData) throw new Error('Post not found');

    const post_author_id = postData.user_id;
    
    // Jangan kirim notifikasi jika pengguna me-like postingannya sendiri
    if (liker_id === post_author_id) {
        return new Response(JSON.stringify({ message: 'User liked their own post. No notification created.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // 2. Periksa pengaturan notifikasi penulis postingan
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('user_settings')
      .select('notifications_enabled, like_notifications')
      .eq('user_id', post_author_id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      // Abaikan error jika tidak ada baris setting (PGRST116), anggap saja notifikasi nonaktif
      throw new Error(`Failed to fetch user settings: ${settingsError.message}`);
    }

    // 3. Jika notifikasi aktif, buat entri notifikasi
    if (settings?.notifications_enabled && settings?.like_notifications) {
      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: post_author_id, // Notifikasi untuk si penulis post
          sender_id: liker_id,     // Notifikasi dari si pemberi like
          post_id: post_id,
          type: 'like',
        });

      if (notificationError) throw new Error(`Failed to create notification: ${notificationError.message}`);
      
      return new Response(JSON.stringify({ message: 'Notification created successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // Jika notifikasi nonaktif, berikan respons sukses tanpa membuat notifikasi
    return new Response(JSON.stringify({ message: 'User has disabled like notifications.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

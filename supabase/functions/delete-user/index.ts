import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the target user_id from request body (for admin deleting other users)
    // Or get from auth token (for self-delete)
    let targetUserId: string;
    
    const body = await req.json().catch(() => ({}));
    
    if (body.user_id) {
      // Admin is deleting another user - verify admin status first
      const token = authHeader.replace('Bearer ', '')
      const { data: adminData } = await supabaseClient.auth.getUser(token)
      const adminUser = adminData.user
      
      if (!adminUser) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if user is admin
      const { data: adminProfile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('user_id', adminUser.id)
        .single()
      
      if (!adminProfile || adminProfile.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Only admins can delete other users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      targetUserId = body.user_id
      
      // Log admin action
      await supabaseClient.from('admin_logs').insert({
        admin_id: adminUser.id,
        action: 'delete_user',
        target_user_id: targetUserId,
        details: { reason: body.reason || 'Admin deleted user' }
      })
    } else {
      // Self-delete
      const token = authHeader.replace('Bearer ', '')
      const { data } = await supabaseClient.auth.getUser(token)
      const user = data.user

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      targetUserId = user.id
    }

    console.log('Starting account deletion for user:', targetUserId)

    // Delete user's storage objects (avatars, posts, memes, etc.)
    const buckets = ['avatars', 'posts', 'memes', 'stories', 'chat-attachments']
    for (const bucket of buckets) {
      const { data: files } = await supabaseClient.storage.from(bucket).list(targetUserId)
      if (files && files.length > 0) {
        const filePaths = files.map(f => `${targetUserId}/${f.name}`)
        await supabaseClient.storage.from(bucket).remove(filePaths)
      }
    }

    // Delete related data manually to avoid FK issues
    await supabaseClient.from('notifications').delete().or(`user_id.eq.${targetUserId},from_user_id.eq.${targetUserId}`)
    await supabaseClient.from('user_notifications').delete().eq('user_id', targetUserId)
    await supabaseClient.from('likes').delete().eq('user_id', targetUserId)
    await supabaseClient.from('comments').delete().eq('user_id', targetUserId)
    await supabaseClient.from('bookmarks').delete().eq('user_id', targetUserId)
    await supabaseClient.from('bookmark_folders').delete().eq('user_id', targetUserId)
    await supabaseClient.from('followers').delete().or(`follower_id.eq.${targetUserId},following_id.eq.${targetUserId}`)
    await supabaseClient.from('messages').delete().eq('sender_id', targetUserId)
    await supabaseClient.from('conversation_members').delete().eq('user_id', targetUserId)
    await supabaseClient.from('stories').delete().eq('user_id', targetUserId)
    await supabaseClient.from('user_roles').delete().eq('user_id', targetUserId)
    await supabaseClient.from('user_sessions').delete().eq('user_id', targetUserId)
    await supabaseClient.from('user_settings').delete().eq('user_id', targetUserId)
    await supabaseClient.from('user_logs').delete().eq('user_id', targetUserId)
    await supabaseClient.from('favorite_users').delete().or(`user_id.eq.${targetUserId},favorite_user_id.eq.${targetUserId}`)
    await supabaseClient.from('favorite_conversations').delete().eq('user_id', targetUserId)
    await supabaseClient.from('reports').delete().or(`reporter_id.eq.${targetUserId},reported_user_id.eq.${targetUserId}`)
    
    // Delete user's posts (and their media)
    const { data: userPosts } = await supabaseClient.from('posts').select('id').eq('user_id', targetUserId)
    if (userPosts) {
      for (const post of userPosts) {
        await supabaseClient.from('post_media').delete().eq('post_id', post.id)
        await supabaseClient.from('post_hashtags').delete().eq('post_id', post.id)
        await supabaseClient.from('likes').delete().eq('post_id', post.id)
        await supabaseClient.from('comments').delete().eq('post_id', post.id)
        await supabaseClient.from('bookmarks').delete().eq('post_id', post.id)
      }
      await supabaseClient.from('posts').delete().eq('user_id', targetUserId)
    }
    
    // Delete user's memes
    const { data: userMemes } = await supabaseClient.from('memes').select('id').eq('user_id', targetUserId)
    if (userMemes) {
      for (const meme of userMemes) {
        await supabaseClient.from('meme_badges').delete().eq('meme_id', meme.id)
        await supabaseClient.from('likes').delete().eq('meme_id', meme.id)
        await supabaseClient.from('comments').delete().eq('meme_id', meme.id)
      }
      await supabaseClient.from('memes').delete().eq('user_id', targetUserId)
    }

    // Delete profile
    await supabaseClient.from('profiles').delete().eq('user_id', targetUserId)

    // Finally delete the auth user
    const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(targetUserId)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      throw authDeleteError
    }

    console.log('Account deletion completed successfully')

    return new Response(
      JSON.stringify({ message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error deleting account:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
import { createClient } from '@supabase/supabase-js'

var cachedClient = null

export function getSupabaseConfig() {
  var url = import.meta.env.VITE_SUPABASE_URL
  var publicKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY
  var imagesBucket =
    import.meta.env.VITE_SUPABASE_STORAGE_BUCKET_IMAGES || 'build-images'
  var modelsBucket =
    import.meta.env.VITE_SUPABASE_STORAGE_BUCKET_MODELS || 'build-models'
  var avatarsBucket =
    import.meta.env.VITE_SUPABASE_STORAGE_BUCKET_AVATARS || 'avatars'

  return {
    url: url,
    publicKey: publicKey,
    imagesBucket: imagesBucket,
    modelsBucket: modelsBucket,
    avatarsBucket: avatarsBucket,
    configured: Boolean(url && publicKey)
  }
}

export function getSupabaseClient() {
  var config = getSupabaseConfig()

  if (!config.configured) {
    return null
  }

  if (!cachedClient) {
    cachedClient = createClient(config.url, config.publicKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  }

  return cachedClient
}

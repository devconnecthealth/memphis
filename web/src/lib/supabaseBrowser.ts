import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
)

export async function token(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session ? data.session.access_token : null
}

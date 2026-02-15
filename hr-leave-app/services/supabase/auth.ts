import { supabase } from './client';
import type { AuthService } from '../types';
import type { Profile } from '@/types/models';

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
  return data as Profile;
}

export const authService: AuthService = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign in failed');
    return fetchProfile(data.user.id);
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    try {
      return await fetchProfile(session.user.id);
    } catch {
      return null;
    }
  },

  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            const profile = await fetchProfile(session.user.id);
            callback(profile);
          } catch {
            callback(null);
          }
        } else {
          callback(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  },
};

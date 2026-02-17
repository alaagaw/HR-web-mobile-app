import { supabase } from './client';
import type { AuthService } from '../types';
import type { Profile } from '@/types/models';
import { RegistrationStatus, Role } from '@/types/enums';

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

    const profile = await fetchProfile(data.user.id);

    // Auto-transition: email verified (they signed in) but status is still email_unverified
    if (profile.registration_status === RegistrationStatus.EmailUnverified) {
      await supabase
        .from('profiles')
        .update({
          registration_status: RegistrationStatus.PendingInfo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.user.id);
      profile.registration_status = RegistrationStatus.PendingInfo;
    }

    return profile;
  },

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign up failed');

    // If Supabase returns a session, email confirmation is disabled (dev mode)
    const needsEmailVerification = !data.session;

    // The DB trigger will create a profile, but it may not be available immediately
    let profile: Profile;
    try {
      profile = await fetchProfile(data.user.id);
    } catch {
      // Profile may not exist yet if trigger hasn't fired; return a minimal one
      profile = {
        id: data.user.id,
        full_name: '',
        email,
        phone: null,
        photo_url: null,
        role: Role.Employee,
        supervisor_id: null,
        manager_id: null,
        department: null,
        workday_hours: 8,
        is_active: true,
        registration_status: RegistrationStatus.EmailUnverified,
        must_change_password: false,
        invited_by: null,
        registration_note: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return { user: profile, needsEmailVerification };
  },

  async changePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);

    // Clear must_change_password flag
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('profiles')
        .update({
          must_change_password: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async getSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return null;
    try {
      return await fetchProfile(session.user.id);
    } catch {
      return null;
    }
  },

  onAuthStateChange(callback) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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
    });
    return () => subscription.unsubscribe();
  },
};

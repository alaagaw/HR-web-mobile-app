import { useState, useEffect } from 'react';
import { View, Text, Image, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { useAuth } from '@/hooks/use-auth';
import { LinearGradient } from 'expo-linear-gradient';
import { signInSchema, type SignInFormData } from '@/lib/validators';

const isWeb = Platform.OS === 'web';

const POLYTECH_BG_URL = '/PolyTech_background.png';

// ─── Web Sign-In ──────────────────────────────────────────────────────

function WebSignIn({
  error,
  loading,
  onSubmit,
  onSignUp,
}: {
  error: string | null;
  loading: boolean;
  onSubmit: (data: { email: string; password: string }) => void;
  onSignUp: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setEmailError('');
    setPasswordError('');

    let valid = true;
    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email');
      valid = false;
    }
    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    }
    if (valid) onSubmit({ email, password });
  };

  const features = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      title: 'Employee Management',
      desc: 'Manage profiles, departments, and organizational structure',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      ),
      title: 'Leave Tracking',
      desc: 'Request, approve, and monitor PTO with full audit trails',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
          <path d="M10 9H8" />
        </svg>
      ),
      title: 'Document Compliance',
      desc: 'Track passport, iqama & insurance expiry across your workforce',
    },
  ];

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '14px 16px',
    fontSize: 15,
    border: `1.5px solid ${hasError ? '#EF4444' : '#334155'}`,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#0F172A',
      }}
    >
      {/* ─── Left Panel — Branding ─── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: `linear-gradient(to top, rgba(3,10,31,0.97) 0%, rgba(3,10,31,0.85) 40%, transparent 100%), url(${POLYTECH_BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      >

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, padding: '0 56px 60px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
              boxShadow: '0 8px 32px rgba(37,99,235,0.3)',
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>HR</span>
          </div>

          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.2,
              margin: '0 0 12px',
              letterSpacing: '-0.5px',
            }}
          >
            Human Resources
            <br />
            Management System
          </h1>
          <p
            style={{
              fontSize: 16,
              color: '#94A3B8',
              lineHeight: 1.6,
              margin: '0 0 48px',
              maxWidth: 400,
            }}
          >
            Streamline employee management, leave tracking, and document compliance — all in one place.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(37,99,235,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', marginBottom: 3 }}>
                    {f.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right Panel — Sign-In Form ─── */}
      <div
        style={{
          width: 520,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 56px',
          backgroundColor: '#0F172A',
          borderLeft: '1px solid #1E293B',
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: 400 }}>
          <h2
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 6px',
            }}
          >
            Welcome back
          </h2>
          <p
            style={{
              fontSize: 14,
              color: '#64748B',
              margin: '0 0 36px',
            }}
          >
            Sign in to your account to continue
          </p>

          {/* Error banner */}
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                backgroundColor: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#FCA5A5',
                fontSize: 14,
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#CBD5E1',
                  marginBottom: 8,
                }}
              >
                Email address
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = emailError ? '#EF4444' : '#334155'; }}
                style={inputStyle(!!emailError)}
                autoComplete="email"
              />
              {emailError && (
                <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{emailError}</div>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 28 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#CBD5E1',
                  marginBottom: 8,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = passwordError ? '#EF4444' : '#334155'; }}
                  style={{ ...inputStyle(!!passwordError), paddingRight: 48 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" x2="23" y1="1" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && (
                <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{passwordError}</div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 12,
                border: 'none',
                background: loading ? '#1E40AF' : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#FFFFFF',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,99,235,0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.3)';
              }}
            >
              {loading && (
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeDasharray="32" strokeLinecap="round" />
                </svg>
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Sign up link */}
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <span style={{ fontSize: 14, color: '#64748B' }}>
              Don't have an account?{' '}
            </span>
            <span
              onClick={onSignUp}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#2563EB',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#3B82F6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#2563EB'; }}
            >
              Sign Up
            </span>
          </div>
        </div>

        {/* Spinner animation */}
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes spin { to { transform: rotate(360deg); } }`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────

export default function SignInScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // On web, track window width so narrow browsers get the mobile layout
  const [useWebLayout, setUseWebLayout] = useState(
    isWeb && typeof window !== 'undefined' ? window.innerWidth >= 980 : false,
  );
  useEffect(() => {
    if (!isWeb) return;
    const onResize = () => setUseWebLayout(window.innerWidth >= 980);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { control, handleSubmit, formState: { errors } } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    setError(null);
    setLoading(true);
    try {
      await signIn(data.email, data.password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // ─── Web (wide screens only) ───────────────────────────────

  if (useWebLayout) {
    return (
      <WebSignIn
        error={error}
        loading={loading}
        onSubmit={onSubmit}
        onSignUp={() => router.push('/(auth)/sign-up' as any)}
      />
    );
  }

  // ─── Mobile ───────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Top: Background image + branding ─── */}
          <View style={{ height: 320, position: 'relative', overflow: 'hidden' }}>
            <Image
              source={require('@/assets/images/PolyTech_background.png')}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            {/* Gradient fade into background color */}
            <LinearGradient
              colors={['transparent', 'rgba(15,23,42,0.7)', '#0F172A']}
              locations={[0, 0.5, 1]}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '60%',
              }}
            />
            {/* Branding overlay */}
            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 24 }}>
              <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4">
                <Text className="text-2xl font-bold text-white">HR</Text>
              </View>
              <Text className="text-2xl font-bold text-white">HR System</Text>
              <Text className="text-sm text-slate-400 mt-1">Sign in to your account</Text>
            </View>
          </View>

          {/* ─── Bottom: Sign-in form ─── */}
          <View className="px-6 pt-8 pb-8" style={{ flex: 1 }}>
            {error && <Banner variant="error" className="mb-4">{error}</Banner>}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@company.com"
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                  secureTextEntry
                  autoComplete="password"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              )}
            />

            <View className="mt-2">
              <Button onPress={handleSubmit(onSubmit)} loading={loading} fullWidth>
                Sign In
              </Button>
            </View>

            <Pressable
              onPress={() => router.push('/(auth)/sign-up' as any)}
              className="mt-4 items-center"
            >
              <Text className="text-sm text-primary">
                Don't have an account? Sign Up
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

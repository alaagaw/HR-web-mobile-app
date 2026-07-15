import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { useAuth } from '@/hooks/use-auth';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { signUpSchema, type SignUpFormData } from '@/lib/validators';

const isWeb = Platform.OS === 'web';

// ─── Web Email-Sent Confirmation ──────────────────────────────────────

function WebEmailSent({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 440, padding: '0 24px' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #16A34A, #15803D)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 32px rgba(22,163,74,0.3)',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: '#FFFFFF',
            margin: '0 0 10px',
          }}
        >
          Check Your Email
        </h2>
        <p
          style={{
            fontSize: 15,
            color: '#94A3B8',
            lineHeight: 1.6,
            margin: '0 0 32px',
          }}
        >
          We sent a verification link to your email. Please click the link to verify your account, then come back and sign in.
        </p>
        <button
          onClick={onSignIn}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: 15,
            fontWeight: 700,
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            color: '#FFFFFF',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,99,235,0.45)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.3)'; }}
        >
          Go to Sign In
        </button>
      </div>
    </div>
  );
}

// ─── Web Sign-Up ──────────────────────────────────────────────────────

function WebSignUp({
  error,
  loading,
  onSubmit,
  onSignIn,
}: {
  error: string | null;
  loading: boolean;
  onSubmit: (data: { email: string; password: string; confirmPassword: string }) => void;
  onSignIn: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setEmailError('');
    setPasswordError('');
    setConfirmError('');

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
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    }
    if (!confirmPassword) {
      setConfirmError('Please confirm your password');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmError('Passwords do not match');
      valid = false;
    }
    if (valid) onSubmit({ email, password, confirmPassword });
  };

  const steps = [
    { num: '1', label: 'Create account', desc: 'Set up your email and password' },
    { num: '2', label: 'Complete profile', desc: 'Fill in your personal details' },
    { num: '3', label: 'Admin approval', desc: 'HR will review and activate your account' },
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

  const eyeButton = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
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
      {show ? (
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
  );

  return (
    <div
      style={{
        display: 'flex',
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
          justifyContent: 'center',
          padding: '60px 56px',
          background: 'linear-gradient(160deg, #1E3A5F 0%, #0F172A 50%, #1E293B 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            left: -60,
            width: 350,
            height: 350,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
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
            Join Your Team
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
            Create your account in 3 simple steps and get started with your organization's HR portal.
          </p>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: i === 0 ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.08)',
                    border: i === 0 ? '1.5px solid rgba(37,99,235,0.4)' : '1.5px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 18,
                    fontWeight: 800,
                    color: i === 0 ? '#3B82F6' : '#475569',
                  }}
                >
                  {s.num}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: i === 0 ? '#F1F5F9' : '#64748B',
                      marginBottom: 3,
                    }}
                  >
                    {s.label}
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                    {s.desc}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 77,
                      marginTop: 48,
                      width: 1.5,
                      height: 20,
                      backgroundColor: '#1E293B',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right Panel — Form ─── */}
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
          overflowY: 'auto',
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
            Create your account
          </h2>
          <p
            style={{
              fontSize: 14,
              color: '#64748B',
              margin: '0 0 32px',
            }}
          >
            Fill in your details to get started
          </p>

          {/* Error */}
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

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
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
              {emailError && <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{emailError}</div>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = passwordError ? '#EF4444' : '#334155'; }}
                  style={{ ...inputStyle(!!passwordError), paddingRight: 48 }}
                  autoComplete="new-password"
                />
                {eyeButton(showPassword, () => setShowPassword(!showPassword))}
              </div>
              {passwordError && <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{passwordError}</div>}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(''); }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = confirmError ? '#EF4444' : '#334155'; }}
                  style={{ ...inputStyle(!!confirmError), paddingRight: 48 }}
                  autoComplete="new-password"
                />
                {eyeButton(showConfirm, () => setShowConfirm(!showConfirm))}
              </div>
              {confirmError && <div style={{ fontSize: 13, color: '#EF4444', marginTop: 6 }}>{confirmError}</div>}
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Sign in link */}
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <span style={{ fontSize: 14, color: '#64748B' }}>
              Already have an account?{' '}
            </span>
            <span
              onClick={onSignIn}
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
              Sign In
            </span>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    setError(null);
    setLoading(true);
    try {
      const result = await signUp(data.email, data.password);
      if (result.needsEmailVerification) {
        setEmailSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToSignIn = () => router.replace('/(auth)/sign-in' as any);

  // ─── Web ──────────────────────────────────────────────────

  if (isWeb && !isMobile) {
    if (emailSent) return <WebEmailSent onSignIn={goToSignIn} />;
    return (
      <WebSignUp
        error={error}
        loading={loading}
        onSubmit={onSubmit}
        onSignIn={goToSignIn}
      />
    );
  }

  // ─── Mobile ───────────────────────────────────────────────

  if (emailSent) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-slate-900">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          className="px-6"
        >
          <View className="items-center mb-10">
            <View className="w-16 h-16 rounded-2xl bg-green-500 items-center justify-center mb-4">
              <Text className="text-2xl text-white">✓</Text>
            </View>
            <Text className="text-2xl font-bold text-text-primary dark:text-white">
              Check Your Email
            </Text>
            <Text className="text-sm text-text-muted dark:text-slate-400 mt-2 text-center px-4">
              We sent a verification link to your email. Please click the link to verify your account, then come back and sign in.
            </Text>
          </View>

          <View className="mt-4">
            <Button
              onPress={goToSignIn}
              fullWidth
            >
              Go to Sign In
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          className="px-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-10">
            <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4">
              <Text className="text-2xl font-bold text-white">HR</Text>
            </View>
            <Text className="text-2xl font-bold text-text-primary dark:text-white">
              HR System
            </Text>
            <Text className="text-sm text-text-muted dark:text-slate-400 mt-1">
              Create your account
            </Text>
          </View>

          {error && (
            <Banner variant="error" className="mb-4">
              {error}
            </Banner>
          )}

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
                placeholder="At least 8 characters"
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
                secureTextEntry
                autoComplete="new-password"
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={value}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />

          <View className="mt-2">
            <Button onPress={handleSubmit(onSubmit)} loading={loading} fullWidth>
              Create Account
            </Button>
          </View>

          <Pressable
            onPress={goToSignIn}
            className="mt-4 items-center"
          >
            <Text className="text-sm text-primary">
              Already have an account? Sign In
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { useAccess } from '@/hooks/use-access';

/**
 * Route-level guard. Defense-in-depth: the navbar already hides
 * resources a user can't reach, but pages are also reachable by
 * typed URL / deep link (especially on web), so guarded screens
 * wrap their content in <AccessGate resourceKey="page:...">.
 *
 * While policies load we show a spinner instead of the page so a
 * just-granted user doesn't see a false "denied" flash and a
 * just-revoked user doesn't see protected content for a frame.
 * HR / HR_Director always pass (failsafe in evaluateAccess), so
 * they can never be locked out of the config screen.
 */
export function AccessGate({
  resourceKey,
  children,
}: {
  resourceKey: string;
  children: React.ReactNode;
}) {
  const { canAccess, loaded } = useAccess();

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!canAccess(resourceKey)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

export function AccessDenied() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: 'rgba(239,68,68,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <ShieldAlert size={32} color="#EF4444" />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#EF4444', marginBottom: 6 }}>
        Access restricted
      </Text>
      <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', maxWidth: 360 }}>
        You don't have access to this page. If you believe this is a mistake,
        contact HR — access is governed by your role, department, and job title.
      </Text>
    </View>
  );
}

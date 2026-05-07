import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="registration-form" />
      <Stack.Screen name="pending-approval" />
    </Stack>
  );
}

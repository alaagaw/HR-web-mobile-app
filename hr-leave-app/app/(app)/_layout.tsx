import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="requests/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="requests/[id]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="admin/employees" />
      <Stack.Screen name="admin/balances" />
      <Stack.Screen name="admin/balance-ledger" />
      <Stack.Screen name="timesheet/projects" />
      <Stack.Screen name="timesheet/suppliers" />
      <Stack.Screen name="timesheet/timesheet-assignments" />
      <Stack.Screen name="timesheet/timesheets" />
    </Stack>
  );
}

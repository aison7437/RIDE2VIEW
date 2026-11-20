import { Stack } from 'expo-router';
import { theme } from '../src/theme';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: theme.colors.navy }, headerTintColor: theme.colors.ivory }}>
      <Stack.Screen name="index" options={{ title: 'Ride2View' }} />
      <Stack.Screen name="properties" options={{ title: 'Discover Homes' }} />
    </Stack>
  );
}

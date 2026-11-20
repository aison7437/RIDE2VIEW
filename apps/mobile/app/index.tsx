import { Link } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../src/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>RIDE2VIEW</Text>
        <Text style={styles.title}>Find a home. Book a viewing.</Text>
        <Text style={styles.description}>Get there with confidence. Explore properties and plan your next viewing.</Text>
        <Link href="/properties" style={styles.button}>Explore homes</Link>
        <Text style={styles.note}>Mobile foundation preview. Bookings and payments are not enabled.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.ivory },
  content: { flex: 1, justifyContent: 'center', padding: theme.spacing.xl, gap: theme.spacing.lg },
  eyebrow: { color: theme.colors.teal, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  title: { fontSize: 37, lineHeight: 43, fontWeight: '800', color: theme.colors.navy },
  description: { color: theme.colors.muted, fontSize: 17, lineHeight: 26 },
  button: { color: theme.colors.white, backgroundColor: theme.colors.teal, overflow: 'hidden', padding: 16, textAlign: 'center', borderRadius: 12, fontWeight: '700' },
  note: { marginTop: theme.spacing.md, color: theme.colors.muted, fontSize: 12 },
});

import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchProperties, type PropertySummary } from '../src/api';
import { theme } from '../src/theme';

export default function PropertiesScreen() {
  const [data, setData] = useState<PropertySummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchProperties(controller.signal)
      .then(setData)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Unable to load properties.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <SafeAreaView style={styles.page}>
      {loading ? <ActivityIndicator accessibilityLabel="Loading properties" color={theme.colors.teal} /> : null}
      {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
      {!loading && !message ? (
        <FlatList data={data} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.message}>No properties found.</Text>}
          renderItem={({ item }) => <View style={styles.card}><Text style={styles.title}>{item.title}</Text><Text style={styles.location}>{item.location}</Text>{typeof item.monthlyRent === 'number' ? <Text style={styles.price}>{item.currency ?? 'KES'} {item.monthlyRent.toLocaleString()}</Text> : null}</View>}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.ivory, padding: theme.spacing.md },
  list: { gap: theme.spacing.md },
  card: { padding: theme.spacing.lg, backgroundColor: theme.colors.white, borderRadius: 14 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.navy },
  location: { marginTop: 8, color: theme.colors.muted },
  price: { marginTop: 12, color: theme.colors.teal, fontWeight: '700' },
  message: { color: theme.colors.muted, padding: theme.spacing.lg },
});

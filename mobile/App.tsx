import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { isSupabaseConfigured } from './src/lib/supabase';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>FishApp MVP</Text>
        <Text style={styles.title}>Fislerini akilli harcama kayitlarina donustur.</Text>
        <Text style={styles.subtitle}>
          Gun 1 temeli hazir: Expo uygulamasi aciliyor, Supabase client iskeleti kuruldu.
        </Text>
      </View>

      <View style={styles.statusPanel}>
        <Text style={styles.statusLabel}>Backend baglantisi</Text>
        <Text style={[styles.statusValue, isSupabaseConfigured ? styles.ready : styles.pending]}>
          {isSupabaseConfigured ? 'Hazir' : 'Env bekliyor'}
        </Text>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7faf8',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    gap: 12,
  },
  eyebrow: {
    color: '#21725e',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#12231d',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    color: '#52645d',
    fontSize: 16,
    lineHeight: 24,
  },
  statusPanel: {
    width: '100%',
    marginTop: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  statusLabel: {
    color: '#52645d',
    fontSize: 14,
  },
  statusValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
  },
  ready: {
    color: '#21725e',
  },
  pending: {
    color: '#a35f00',
  },
});

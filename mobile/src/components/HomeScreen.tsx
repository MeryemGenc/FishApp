import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../lib/supabase';

type HomeScreenProps = {
  session: Session;
};

export function HomeScreen({ session }: HomeScreenProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>FishApp</Text>
        <Text style={styles.title}>Oturum acik.</Text>
        <Text style={styles.subtitle}>
          {session.user.email ?? 'Kullanici'} hesabi ile devam ediyorsun. Siradaki adim kamera
          entegrasyonu.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Gun 2 durumu</Text>
        <Text style={styles.panelValue}>Auth ve session hazir</Text>
      </View>

      <Pressable
        disabled={isSigningOut}
        onPress={handleSignOut}
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && styles.pressed,
          isSigningOut && styles.disabled,
        ]}
      >
        {isSigningOut ? (
          <ActivityIndicator color="#21725e" />
        ) : (
          <Text style={styles.signOutButtonText}>Cikis yap</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f7faf8',
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
  panel: {
    marginTop: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  panelLabel: {
    color: '#52645d',
    fontSize: 14,
  },
  panelValue: {
    marginTop: 6,
    color: '#21725e',
    fontSize: 20,
    fontWeight: '800',
  },
  signOutButton: {
    minHeight: 52,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#21725e',
    backgroundColor: '#ffffff',
  },
  signOutButtonText: {
    color: '#21725e',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.7,
  },
});

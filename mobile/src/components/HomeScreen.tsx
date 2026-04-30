import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../lib/supabase';
import type { ReceiptUploadResult } from '../services/receiptUpload';

type HomeScreenProps = {
  isUploading: boolean;
  latestPhotoUri: string | null;
  latestUpload: ReceiptUploadResult | null;
  onOpenCamera: () => void;
  session: Session;
  uploadError: string;
};

export function HomeScreen({
  isUploading,
  latestPhotoUri,
  latestUpload,
  onOpenCamera,
  session,
  uploadError,
}: HomeScreenProps) {
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
          {session.user.email ?? 'Kullanici'} hesabi ile devam ediyorsun. Fis fotografi cekerek
          analiz akisini baslatabilirsin.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Gun 4 durumu</Text>
        <Text style={styles.panelValue}>Upload pipeline hazir</Text>
      </View>

      {latestPhotoUri ? (
        <View style={styles.previewPanel}>
          <Image source={{ uri: latestPhotoUri }} style={styles.previewImage} />
          <Text style={styles.previewText}>
            {isUploading ? 'Fotograf Supabase Storage alanina yukleniyor.' : 'Son cekilen fis fotografi hazir.'}
          </Text>
          {latestUpload ? (
            <Text style={styles.uploadText}>Storage path: {latestUpload.path}</Text>
          ) : null}
          {uploadError ? <Text style={styles.errorText}>{uploadError}</Text> : null}
        </View>
      ) : null}

      <Pressable onPress={onOpenCamera} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Fis fotografi cek</Text>
      </Pressable>

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
    marginTop: 12,
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
  primaryButton: {
    minHeight: 52,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#21725e',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  previewPanel: {
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#07110d',
  },
  previewText: {
    color: '#52645d',
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
  },
  uploadText: {
    color: '#21725e',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  errorText: {
    color: '#a33f00',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.7,
  },
});

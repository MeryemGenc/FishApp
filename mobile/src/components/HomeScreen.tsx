import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../lib/supabase';
import type { ReceiptOcrResult } from '../services/receiptOcr';
import type { ParsedReceipt } from '../services/receiptParser';
import type { ReceiptUploadResult } from '../services/receiptUpload';

type HomeScreenProps = {
  isOcrProcessing: boolean;
  isUploading: boolean;
  latestOcr: ReceiptOcrResult | null;
  latestPhotoUri: string | null;
  latestUpload: ReceiptUploadResult | null;
  ocrError: string;
  onOpenCamera: () => void;
  parsedReceipt: ParsedReceipt | null;
  session: Session | null;
  uploadError: string;
};

export function HomeScreen({
  isOcrProcessing,
  isUploading,
  latestOcr,
  latestPhotoUri,
  latestUpload,
  ocrError,
  onOpenCamera,
  parsedReceipt,
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>FishApp</Text>
        <Text style={styles.title}>{session ? 'Oturum acik.' : 'Demo sonucu.'}</Text>
        <Text style={styles.subtitle}>
          {session
            ? `${session.user.email ?? 'Kullanici'} hesabi ile devam ediyorsun. Fis fotografi cekerek analiz akisini baslatabilirsin.`
            : 'Demo modunda kamera, OCR ve parsing akisini test ediyorsun.'}
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Gun 6 durumu</Text>
        <Text style={styles.panelValue}>Parsing engine hazir</Text>
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

      {latestPhotoUri ? (
        <View style={styles.ocrPanel}>
          <Text style={styles.ocrTitle}>OCR sonucu</Text>
          {isOcrProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color="#21725e" />
              <Text style={styles.processingText}>Fis metni okunuyor.</Text>
            </View>
          ) : null}
          {latestOcr ? (
            <>
              <Text style={styles.ocrProvider}>Provider: {latestOcr.provider}</Text>
              <Text style={styles.ocrText}>{latestOcr.rawText}</Text>
            </>
          ) : null}
          {ocrError ? <Text style={styles.errorText}>{ocrError}</Text> : null}
        </View>
      ) : null}

      {parsedReceipt ? (
        <View style={styles.parsedPanel}>
          <Text style={styles.ocrTitle}>Cikarilan bilgiler</Text>
          <View style={styles.parsedRow}>
            <Text style={styles.parsedLabel}>Magaza</Text>
            <Text style={styles.parsedValue}>{parsedReceipt.merchant ?? 'Bulunamadi'}</Text>
          </View>
          <View style={styles.parsedRow}>
            <Text style={styles.parsedLabel}>Tutar</Text>
            <Text style={styles.parsedValue}>
              {parsedReceipt.totalAmount === null ? 'Bulunamadi' : `${parsedReceipt.totalAmount.toFixed(2)} TL`}
            </Text>
          </View>
          <View style={styles.parsedRow}>
            <Text style={styles.parsedLabel}>Tarih</Text>
            <Text style={styles.parsedValue}>{parsedReceipt.date ?? 'Bulunamadi'}</Text>
          </View>
        </View>
      ) : null}

      <Pressable onPress={onOpenCamera} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Fis fotografi cek</Text>
      </Pressable>

      {session ? (
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
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
  ocrPanel: {
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 10,
  },
  ocrTitle: {
    color: '#12231d',
    fontSize: 18,
    fontWeight: '800',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  processingText: {
    color: '#52645d',
    fontSize: 14,
  },
  ocrProvider: {
    color: '#21725e',
    fontSize: 13,
    fontWeight: '700',
  },
  ocrText: {
    color: '#12231d',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  parsedPanel: {
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 12,
  },
  parsedRow: {
    gap: 4,
  },
  parsedLabel: {
    color: '#52645d',
    fontSize: 13,
    fontWeight: '700',
  },
  parsedValue: {
    color: '#12231d',
    fontSize: 17,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.7,
  },
});

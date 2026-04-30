import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthScreen } from './src/components/AuthScreen';
import { CameraScreen } from './src/components/CameraScreen';
import { HomeScreen } from './src/components/HomeScreen';
import { useAuthSession } from './src/hooks/useAuthSession';
import { uploadReceiptImage, type ReceiptUploadResult } from './src/services/receiptUpload';

export default function App() {
  const { session, isLoading } = useAuthSession();
  const [activeScreen, setActiveScreen] = useState<'home' | 'camera'>('home');
  const [latestPhotoUri, setLatestPhotoUri] = useState<string | null>(null);
  const [latestUpload, setLatestUpload] = useState<ReceiptUploadResult | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#21725e" size="large" />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <>
      {activeScreen === 'camera' ? (
        <CameraScreen
          onClose={() => setActiveScreen('home')}
          onUsePhoto={async (photoUri) => {
            setLatestPhotoUri(photoUri);
            setActiveScreen('home');

            if (!session) {
              setLatestUpload(null);
              setUploadError('Upload icin once Supabase auth ile giris yapmak gerekiyor.');
              return;
            }

            setIsUploading(true);
            setUploadError('');

            try {
              const upload = await uploadReceiptImage(photoUri, session.user.id);
              setLatestUpload(upload);
            } catch (error) {
              setLatestUpload(null);
              setUploadError(error instanceof Error ? error.message : 'Fotograf yuklenemedi.');
            } finally {
              setIsUploading(false);
            }
          }}
        />
      ) : null}

      {session && activeScreen === 'home' ? (
        <HomeScreen
          isUploading={isUploading}
          latestPhotoUri={latestPhotoUri}
          latestUpload={latestUpload}
          onOpenCamera={() => setActiveScreen('camera')}
          session={session}
          uploadError={uploadError}
        />
      ) : null}

      {!session && activeScreen === 'home' ? (
        <AuthScreen onPreviewCamera={() => setActiveScreen('camera')} />
      ) : null}
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f7faf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

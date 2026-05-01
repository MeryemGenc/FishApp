import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthScreen } from './src/components/AuthScreen';
import { CameraScreen } from './src/components/CameraScreen';
import { HomeScreen } from './src/components/HomeScreen';
import { useAuthSession } from './src/hooks/useAuthSession';
import { parseReceipt, type ParsedReceipt } from './src/services/receiptParser';
import { extractReceiptText, type ReceiptOcrResult } from './src/services/receiptOcr';
import { uploadReceiptImage, type ReceiptUploadResult } from './src/services/receiptUpload';

export default function App() {
  const { session, isLoading } = useAuthSession();
  const [activeScreen, setActiveScreen] = useState<'home' | 'camera'>('home');
  const [latestPhotoUri, setLatestPhotoUri] = useState<string | null>(null);
  const [latestUpload, setLatestUpload] = useState<ReceiptUploadResult | null>(null);
  const [latestOcr, setLatestOcr] = useState<ReceiptOcrResult | null>(null);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [ocrError, setOcrError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

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
            setLatestUpload(null);
            setLatestOcr(null);
            setParsedReceipt(null);
            setUploadError('');
            setOcrError('');

            if (!session) {
              setUploadError('Upload icin once Supabase auth ile giris yapmak gerekiyor.');
            }

            let upload: ReceiptUploadResult | null = null;

            if (session) {
              setIsUploading(true);

              try {
                upload = await uploadReceiptImage(photoUri, session.user.id);
                setLatestUpload(upload);
              } catch (error) {
                setUploadError(error instanceof Error ? error.message : 'Fotograf yuklenemedi.');
              } finally {
                setIsUploading(false);
              }
            }

            setIsOcrProcessing(true);

            try {
              const ocr = await extractReceiptText({
                imageUri: photoUri,
                imageUrl: upload?.publicUrl,
              });
              setLatestOcr(ocr);
              setParsedReceipt(parseReceipt(ocr.rawText));
            } catch (error) {
              setOcrError(error instanceof Error ? error.message : 'OCR metni cikarilamadi.');
            } finally {
              setIsOcrProcessing(false);
            }
          }}
        />
      ) : null}

      {(session || latestPhotoUri) && activeScreen === 'home' ? (
        <HomeScreen
          isOcrProcessing={isOcrProcessing}
          isUploading={isUploading}
          latestOcr={latestOcr}
          latestPhotoUri={latestPhotoUri}
          latestUpload={latestUpload}
          ocrError={ocrError}
          onOpenCamera={() => setActiveScreen('camera')}
          parsedReceipt={parsedReceipt}
          session={session}
          uploadError={uploadError}
        />
      ) : null}

      {!session && !latestPhotoUri && activeScreen === 'home' ? (
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

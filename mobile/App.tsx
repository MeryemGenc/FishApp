import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthScreen } from './src/components/AuthScreen';
import { CameraScreen } from './src/components/CameraScreen';
import { HomeScreen } from './src/components/HomeScreen';
import { useAuthSession } from './src/hooks/useAuthSession';
import { categorizeReceiptWithAiFallback } from './src/services/receiptAiCategorizer';
import { categorizeReceiptWithRules } from './src/services/receiptCategorizer';
import { parseReceipt, type ParsedReceipt } from './src/services/receiptParser';
import { extractReceiptText, type ReceiptOcrResult } from './src/services/receiptOcr';
import { listReceipts, saveReceipt, type ReceiptListItem, type SavedReceipt } from './src/services/receiptRepository';
import { uploadReceiptImage, type ReceiptUploadResult } from './src/services/receiptUpload';

export default function App() {
  const { session, isLoading } = useAuthSession();
  const [activeScreen, setActiveScreen] = useState<'home' | 'camera'>('home');
  const [latestPhotoUri, setLatestPhotoUri] = useState<string | null>(null);
  const [latestUpload, setLatestUpload] = useState<ReceiptUploadResult | null>(null);
  const [latestOcr, setLatestOcr] = useState<ReceiptOcrResult | null>(null);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<SavedReceipt | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [ocrError, setOcrError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isSavingReceipt, setIsSavingReceipt] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [receiptsError, setReceiptsError] = useState('');
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);

  async function refreshReceipts(userId = session?.user.id) {
    if (!userId) {
      setReceipts([]);
      setReceiptsError('');
      return;
    }

    setIsLoadingReceipts(true);
    setReceiptsError('');

    try {
      const nextReceipts = await listReceipts(userId);
      setReceipts(nextReceipts);
    } catch (error) {
      setReceiptsError(error instanceof Error ? error.message : 'Fis listesi yuklenemedi.');
    } finally {
      setIsLoadingReceipts(false);
    }
  }

  useEffect(() => {
    if (session) {
      void refreshReceipts(session.user.id);
    } else {
      setReceipts([]);
      setReceiptsError('');
    }
  }, [session]);

  function resetReceiptFlow() {
    setActiveScreen('home');
    setLatestPhotoUri(null);
    setLatestUpload(null);
    setLatestOcr(null);
    setParsedReceipt(null);
    setSavedReceipt(null);
    setUploadError('');
    setOcrError('');
    setSaveError('');
    setIsUploading(false);
    setIsOcrProcessing(false);
    setIsSavingReceipt(false);
    setReceipts([]);
    setReceiptsError('');
    setIsLoadingReceipts(false);
  }

  async function processReceiptPhoto(photoUri: string) {
    setLatestPhotoUri(photoUri);
    setActiveScreen('home');
    setLatestUpload(null);
    setLatestOcr(null);
    setParsedReceipt(null);
    setSavedReceipt(null);
    setUploadError('');
    setOcrError('');
    setSaveError('');

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
      const ruleCategory = categorizeReceiptWithRules(parseReceipt(ocr.rawText));
      const parsed = ruleCategory.matched
        ? ruleCategory.receipt
        : await categorizeReceiptWithAiFallback(ruleCategory.receipt);
      setLatestOcr(ocr);
      setParsedReceipt(parsed);

      if (session) {
        setIsSavingReceipt(true);

        try {
          const saved = await saveReceipt({
            userId: session.user.id,
            imageUrl: upload?.publicUrl ?? null,
            parsedReceipt: parsed,
          });
          setSavedReceipt(saved);
          await refreshReceipts(session.user.id);
        } catch (error) {
          setSaveError(error instanceof Error ? error.message : 'Fis DB kaydi olusturulamadi.');
        } finally {
          setIsSavingReceipt(false);
        }
      } else {
        setSaveError('DB kaydi icin Supabase auth ile giris yapmak gerekiyor.');
      }
    } catch (error) {
      setOcrError(error instanceof Error ? error.message : 'OCR metni cikarilamadi.');
    } finally {
      setIsOcrProcessing(false);
    }
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadError('Galeri izni olmadan fotograf secemiyorum.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await processReceiptPhoto(result.assets[0].uri);
    }
  }

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
          onUsePhoto={processReceiptPhoto}
        />
      ) : null}

      {(session || latestPhotoUri) && activeScreen === 'home' ? (
        <HomeScreen
          isOcrProcessing={isOcrProcessing}
          isLoadingReceipts={isLoadingReceipts}
          isSavingReceipt={isSavingReceipt}
          isUploading={isUploading}
          latestOcr={latestOcr}
          latestPhotoUri={latestPhotoUri}
          latestUpload={latestUpload}
          ocrError={ocrError}
          onOpenCamera={() => setActiveScreen('camera')}
          onPickPhoto={handlePickPhoto}
          onReturnToAuth={resetReceiptFlow}
          parsedReceipt={parsedReceipt}
          receipts={receipts}
          receiptsError={receiptsError}
          onRefreshReceipts={() => refreshReceipts()}
          savedReceipt={savedReceipt}
          saveError={saveError}
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

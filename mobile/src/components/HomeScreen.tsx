import type { Session } from '@supabase/supabase-js';
import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../lib/supabase';
import type { ReceiptOcrResult } from '../services/receiptOcr';
import type { ParsedReceipt } from '../services/receiptParser';
import type { ReceiptListItem, SavedReceipt } from '../services/receiptRepository';
import type { ReceiptUploadResult } from '../services/receiptUpload';

type TabKey = 'entry' | 'receipts' | 'analysis' | 'account';
type ThemeColorKey = 'green' | 'blue' | 'rose' | 'amber';

type ThemeColor = {
  key: ThemeColorKey;
  label: string;
  primary: string;
  soft: string;
};

type HomeScreenProps = {
  isLoadingReceipts: boolean;
  isOcrProcessing: boolean;
  isSavingReceipt: boolean;
  isUploading: boolean;
  latestOcr: ReceiptOcrResult | null;
  latestPhotoUri: string | null;
  latestUpload: ReceiptUploadResult | null;
  ocrError: string;
  onOpenCamera: () => void;
  onPickPhoto: () => void;
  onRefreshReceipts: () => void;
  onReturnToAuth: () => void;
  parsedReceipt: ParsedReceipt | null;
  receipts: ReceiptListItem[];
  receiptsError: string;
  savedReceipt: SavedReceipt | null;
  saveError: string;
  session: Session | null;
  uploadError: string;
};

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'entry', label: 'FIS GIRISI' },
  { key: 'receipts', label: 'FISLERIM' },
  { key: 'analysis', label: 'ANALIZ' },
  { key: 'account', label: 'HESABIM' },
];

const THEME_COLORS: ThemeColor[] = [
  { key: 'green', label: 'Yesil', primary: '#21725e', soft: '#e4f3ed' },
  { key: 'blue', label: 'Mavi', primary: '#1c5b9b', soft: '#e2effb' },
  { key: 'rose', label: 'Gul', primary: '#9b315d', soft: '#fde7ef' },
  { key: 'amber', label: 'Amber', primary: '#9a5f00', soft: '#fff0dc' },
];

export function HomeScreen({
  isLoadingReceipts,
  isOcrProcessing,
  isSavingReceipt,
  isUploading,
  latestOcr,
  latestPhotoUri,
  latestUpload,
  ocrError,
  onOpenCamera,
  onPickPhoto,
  onRefreshReceipts,
  onReturnToAuth,
  parsedReceipt,
  receipts,
  receiptsError,
  savedReceipt,
  saveError,
  session,
  uploadError,
}: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('entry');
  const [themeColorKey, setThemeColorKey] = useState<ThemeColorKey>('green');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

  const themeColor = THEME_COLORS.find((color) => color.key === themeColorKey) ?? THEME_COLORS[0];

  const analysisSummary = useMemo(() => {
    const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.total_amount ?? 0), 0);
    const marketCount = receipts.filter((receipt) => receipt.category === 'Market').length;

    return {
      receiptCount: receipts.length,
      totalAmount,
      marketCount,
    };
  }, [receipts]);

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
  }

  async function handleCopyOcrText(rawText: string) {
    await Clipboard.setStringAsync(rawText);
    setCopyMessage('OCR METNI KOPYALANDI.');
  }

  function formatReceiptAmount(amount: number | null) {
    return amount === null ? '-' : `${amount.toFixed(2)} TL`;
  }

  function formatReceiptDate(date: string | null, createdAt: string) {
    const dateText = date ?? createdAt.slice(0, 10);
    const [year, month, day] = dateText.split('-');

    return year && month && day ? `${day}.${month}.${year}` : dateText;
  }

  function getCategoryStyle(category: string | null) {
    switch (category) {
      case 'Market':
        return { icon: 'M', color: '#21725e', backgroundColor: '#e4f3ed' };
      case 'Food':
        return { icon: 'F', color: '#9a4f00', backgroundColor: '#fff0dc' };
      case 'Transport':
        return { icon: 'T', color: '#1c5b9b', backgroundColor: '#e2effb' };
      default:
        return { icon: '?', color: '#52645d', backgroundColor: '#eef2ef' };
    }
  }

  function renderEntryTab() {
    return (
      <>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: themeColor.primary }]}>FishApp</Text>
          <Text style={styles.title}>FIS GIRISI</Text>
          <Text style={styles.subtitle}>
            {session
              ? 'Yeni fis fotografi cekebilir veya galeriden secebilirsin.'
              : 'Demo modunda kamera, OCR ve parsing akisini test ediyorsun.'}
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Gun 11 durumu</Text>
          <Text style={[styles.panelValue, { color: themeColor.primary }]}>FIS LISTESI HAZIR</Text>
        </View>

        <Pressable
          onPress={onOpenCamera}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: themeColor.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>FIS FOTOGRAFI CEK</Text>
        </Pressable>

        <Pressable
          onPress={onPickPhoto}
          style={({ pressed }) => [
            styles.galleryButton,
            { borderColor: themeColor.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.galleryButtonText, { color: themeColor.primary }]}>GALERIDEN SEC</Text>
        </Pressable>

        {latestPhotoUri ? (
          <View style={styles.previewPanel}>
            <Image source={{ uri: latestPhotoUri }} style={styles.previewImage} />
            <Text style={styles.previewText}>
              {isUploading ? 'Fotograf Supabase Storage alanina yukleniyor.' : 'Son fis fotografi hazir.'}
            </Text>
            {latestUpload ? <Text style={styles.uploadText}>Storage path: {latestUpload.path}</Text> : null}
            {uploadError ? <Text style={styles.errorText}>{uploadError}</Text> : null}
          </View>
        ) : null}

        {latestPhotoUri ? (
          <View style={styles.ocrPanel}>
            <Text style={styles.sectionTitle}>OCR sonucu</Text>
            {isOcrProcessing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#21725e" />
                <Text style={styles.processingText}>Fis metni okunuyor.</Text>
              </View>
            ) : null}
            {latestOcr ? (
              <>
                <Text style={[styles.ocrProvider, { color: themeColor.primary }]}>Provider: {latestOcr.provider}</Text>
                {latestOcr.reason ? <Text style={styles.ocrReason}>Reason: {latestOcr.reason}</Text> : null}
                <Pressable
                  onPress={() => handleCopyOcrText(latestOcr.rawText)}
                  style={({ pressed }) => [
                    styles.copyButton,
                    { borderColor: themeColor.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.copyButtonText, { color: themeColor.primary }]}>OCR METNINI KOPYALA</Text>
                </Pressable>
                {copyMessage ? <Text style={[styles.copyMessage, { color: themeColor.primary }]}>{copyMessage}</Text> : null}
                <Text style={styles.ocrText}>{latestOcr.rawText}</Text>
              </>
            ) : null}
            {ocrError ? <Text style={styles.errorText}>{ocrError}</Text> : null}
          </View>
        ) : null}

        {parsedReceipt ? (
          <View style={styles.parsedPanel}>
            <Text style={styles.sectionTitle}>Cikarilan bilgiler</Text>
            <InfoRow label="Magaza" value={parsedReceipt.merchant ?? 'Bulunamadi'} />
            <InfoRow
              label="Tutar"
              value={parsedReceipt.totalAmount === null ? 'Bulunamadi' : `${parsedReceipt.totalAmount.toFixed(2)} TL`}
            />
            <InfoRow label="Tarih" value={parsedReceipt.date ?? 'Bulunamadi'} />
            <InfoRow label="Kategori" value={parsedReceipt.category ?? 'Henuz atanmadi'} />
            <InfoRow
              label="Guven skoru"
              value={parsedReceipt.confidence === null ? 'Henuz yok' : `%${Math.round(parsedReceipt.confidence * 100)}`}
            />
          </View>
        ) : null}

        {parsedReceipt ? (
          <View style={styles.savePanel}>
            <Text style={styles.sectionTitle}>KAYIT DURUMU</Text>
            {isSavingReceipt ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#21725e" />
                <Text style={styles.processingText}>Fis veritabanina kaydediliyor.</Text>
              </View>
            ) : null}
            {savedReceipt ? (
              <Text style={[styles.successText, { color: themeColor.primary }]}>FIS DB KAYDI OLUSTURULDU.</Text>
            ) : null}
            {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
          </View>
        ) : null}
      </>
    );
  }

  function renderReceiptsTab() {
    return (
      <View style={styles.receiptsPanel}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>FISLERIM</Text>
            <Text style={styles.sectionSubtitle}>Kaydedilen son fislerin</Text>
          </View>
          <Pressable onPress={onRefreshReceipts} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
            <Text style={[styles.refreshButtonText, { color: themeColor.primary }]}>YENILE</Text>
          </Pressable>
        </View>

        {isLoadingReceipts ? (
          <View style={styles.processingRow}>
            <ActivityIndicator color="#21725e" />
            <Text style={styles.processingText}>Fisler yukleniyor.</Text>
          </View>
        ) : null}

        {receiptsError ? <Text style={styles.errorText}>{receiptsError}</Text> : null}

        {!isLoadingReceipts && receipts.length === 0 && !receiptsError ? (
          <Text style={styles.emptyText}>Henuz kayitli fis yok.</Text>
        ) : null}

        {receipts.map((receipt) => {
          const categoryStyle = getCategoryStyle(receipt.category);

          return (
            <View key={receipt.id} style={styles.receiptRow}>
              <View style={[styles.categoryIcon, { backgroundColor: categoryStyle.backgroundColor }]}>
                <Text style={[styles.categoryIconText, { color: categoryStyle.color }]}>{categoryStyle.icon}</Text>
              </View>
              <View style={styles.receiptMain}>
                <Text numberOfLines={1} style={styles.receiptMerchant}>
                  {receipt.merchant ?? 'Bilinmeyen magaza'}
                </Text>
                <View style={styles.receiptMetaRow}>
                  <Text style={[styles.receiptCategory, { color: themeColor.primary }]}>{receipt.category ?? 'Other'}</Text>
                  <Text style={styles.receiptDate}>{formatReceiptDate(receipt.date, receipt.created_at)}</Text>
                </View>
              </View>
              <Text style={styles.receiptAmount}>{formatReceiptAmount(receipt.total_amount)}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  function renderAnalysisTab() {
    return (
      <View style={styles.analysisPanel}>
        <Text style={styles.sectionTitle}>ANALIZ</Text>
        <Text style={styles.sectionSubtitle}>Gun 12 icin temel hazirlik</Text>
        <View style={styles.metricGrid}>
          <Metric label="FIS SAYISI" value={String(analysisSummary.receiptCount)} />
          <Metric label="Toplam" value={`${analysisSummary.totalAmount.toFixed(2)} TL`} />
          <Metric label="Market fisleri" value={String(analysisSummary.marketCount)} />
        </View>
      </View>
    );
  }

  function renderAccountTab() {
    return (
      <View style={styles.accountPanel}>
        <Text style={styles.sectionTitle}>HESABIM</Text>
        <Text style={styles.sectionSubtitle}>{session?.user.email ?? 'DEMO MODU'}</Text>

        <View style={styles.themePanel}>
          <Text style={styles.themeTitle}>TEMA RENGI</Text>
          <View style={styles.themeSwatches}>
            {THEME_COLORS.map((color) => {
              const isSelected = color.key === themeColorKey;

              return (
                <Pressable
                  key={color.key}
                  onPress={() => setThemeColorKey(color.key)}
                  style={[
                    styles.themeSwatch,
                    {
                      borderColor: isSelected ? color.primary : '#d8e3dd',
                      backgroundColor: color.soft,
                    },
                  ]}
                >
                  <View style={[styles.themeDot, { backgroundColor: color.primary }]} />
                  <Text style={[styles.themeSwatchText, isSelected && { color: color.primary }]}>{color.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {session ? (
          <Pressable
            disabled={isSigningOut}
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutButton,
              { borderColor: themeColor.primary },
              pressed && styles.pressed,
              isSigningOut && styles.disabled,
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator color={themeColor.primary} />
            ) : (
              <Text style={[styles.signOutButtonText, { color: themeColor.primary }]}>CIKIS YAP</Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={onReturnToAuth}
            style={({ pressed }) => [
              styles.signOutButton,
              { borderColor: themeColor.primary },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.signOutButtonText, { color: themeColor.primary }]}>GIRIS EKRANINA DON</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {activeTab === 'entry' ? renderEntryTab() : null}
        {activeTab === 'receipts' ? renderReceiptsTab() : null}
        {activeTab === 'analysis' ? renderAnalysisTab() : null}
        {activeTab === 'account' ? renderAccountTab() : null}
      </ScrollView>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tabButton,
              activeTab === tab.key && {
                backgroundColor: themeColor.soft,
                borderColor: themeColor.primary,
              },
            ]}
          >
            <Text style={[styles.tabButtonText, activeTab === tab.key && { color: themeColor.primary }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.parsedRow}>
      <Text style={styles.parsedLabel}>{label}</Text>
      <Text style={styles.parsedValue}>{value}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7faf8',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 112,
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
  galleryButton: {
    minHeight: 52,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#21725e',
    backgroundColor: '#ffffff',
  },
  galleryButtonText: {
    color: '#21725e',
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
  sectionTitle: {
    color: '#12231d',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 4,
    color: '#52645d',
    fontSize: 13,
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
  ocrReason: {
    color: '#a35f00',
    fontSize: 13,
    lineHeight: 19,
  },
  copyButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#21725e',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
  },
  copyButtonText: {
    color: '#21725e',
    fontSize: 14,
    fontWeight: '800',
  },
  copyMessage: {
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
  savePanel: {
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 10,
  },
  successText: {
    color: '#21725e',
    fontSize: 14,
    fontWeight: '800',
  },
  receiptsPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  refreshButton: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#f7faf8',
    paddingHorizontal: 12,
  },
  refreshButtonText: {
    color: '#21725e',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    color: '#52645d',
    fontSize: 14,
    lineHeight: 20,
  },
  receiptRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eef2ef',
    paddingTop: 12,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  categoryIconText: {
    fontSize: 15,
    fontWeight: '900',
  },
  receiptMain: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  receiptMerchant: {
    color: '#12231d',
    fontSize: 15,
    fontWeight: '800',
  },
  receiptMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptCategory: {
    color: '#21725e',
    fontSize: 12,
    fontWeight: '800',
  },
  receiptDate: {
    color: '#52645d',
    fontSize: 12,
  },
  receiptAmount: {
    color: '#12231d',
    fontSize: 15,
    fontWeight: '900',
  },
  analysisPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 14,
  },
  metricGrid: {
    gap: 10,
  },
  metric: {
    borderRadius: 8,
    backgroundColor: '#f7faf8',
    padding: 12,
    gap: 6,
  },
  metricLabel: {
    color: '#52645d',
    fontSize: 13,
    fontWeight: '700',
  },
  metricValue: {
    color: '#12231d',
    fontSize: 20,
    fontWeight: '900',
  },
  accountPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 12,
  },
  themePanel: {
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#f7faf8',
    padding: 12,
  },
  themeTitle: {
    color: '#12231d',
    fontSize: 14,
    fontWeight: '800',
  },
  themeSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeSwatch: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: 10,
  },
  themeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  themeSwatchText: {
    color: '#52645d',
    fontSize: 13,
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
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#d8e3dd',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 14,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#f7faf8',
    paddingHorizontal: 4,
  },
  tabButtonText: {
    color: '#52645d',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.7,
  },
});

import type { Session } from '@supabase/supabase-js';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../lib/supabase';
import type { ReceiptOcrResult } from '../services/receiptOcr';
import type { ParsedReceipt } from '../services/receiptParser';
import type {
  MonthlySpendingSummary,
  ReceiptListItem,
  SavedReceipt,
  YearlySpendingSummary,
} from '../services/receiptRepository';
import type { ReceiptUploadResult } from '../services/receiptUpload';

type TabKey = 'entry' | 'receipts' | 'analysis' | 'account';
type ThemeColorKey = 'green' | 'blue' | 'rose' | 'amber';
type AnalysisCategoryKey = 'All' | string;

type ThemeColor = {
  key: ThemeColorKey;
  label: string;
  primary: string;
  soft: string;
};

type HomeScreenProps = {
  analysisError: string;
  isLoadingAnalysis: boolean;
  isLoadingReceipts: boolean;
  isOcrProcessing: boolean;
  isSavingReceipt: boolean;
  isUploading: boolean;
  latestOcr: ReceiptOcrResult | null;
  latestPhotoUri: string | null;
  latestUpload: ReceiptUploadResult | null;
  monthlySummary: MonthlySpendingSummary | null;
  ocrError: string;
  onOpenCamera: () => void;
  onPickPhoto: () => void;
  onRefreshAnalysis: () => void;
  onRefreshReceipts: () => void;
  onReturnToAuth: () => void;
  onSelectAnalysisMonth: (month: number) => void;
  onSelectAnalysisYear: (year: number) => void;
  parsedReceipt: ParsedReceipt | null;
  receipts: ReceiptListItem[];
  receiptsError: string;
  savedReceipt: SavedReceipt | null;
  saveError: string;
  selectedAnalysisMonth: number;
  selectedAnalysisYear: number;
  session: Session | null;
  uploadError: string;
  yearlySummary: YearlySpendingSummary | null;
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

const MONTH_OPTIONS = [
  { value: 1, label: 'OCAK' },
  { value: 2, label: 'SUBAT' },
  { value: 3, label: 'MART' },
  { value: 4, label: 'NISAN' },
  { value: 5, label: 'MAYIS' },
  { value: 6, label: 'HAZIRAN' },
  { value: 7, label: 'TEMMUZ' },
  { value: 8, label: 'AGUSTOS' },
  { value: 9, label: 'EYLUL' },
  { value: 10, label: 'EKIM' },
  { value: 11, label: 'KASIM' },
  { value: 12, label: 'ARALIK' },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
const DEFAULT_CATEGORY_OPTIONS = ['Market', 'Food', 'Transport', 'Other'];

export function HomeScreen({
  analysisError,
  isLoadingAnalysis,
  isLoadingReceipts,
  isOcrProcessing,
  isSavingReceipt,
  isUploading,
  latestOcr,
  latestPhotoUri,
  latestUpload,
  monthlySummary,
  ocrError,
  onOpenCamera,
  onPickPhoto,
  onRefreshAnalysis,
  onRefreshReceipts,
  onReturnToAuth,
  onSelectAnalysisMonth,
  onSelectAnalysisYear,
  parsedReceipt,
  receipts,
  receiptsError,
  savedReceipt,
  saveError,
  selectedAnalysisMonth,
  selectedAnalysisYear,
  session,
  uploadError,
  yearlySummary,
}: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('entry');
  const [themeColorKey, setThemeColorKey] = useState<ThemeColorKey>('green');
  const [openAnalysisSelect, setOpenAnalysisSelect] = useState<'year' | 'month' | 'category' | null>(null);
  const [selectedAnalysisCategory, setSelectedAnalysisCategory] = useState<AnalysisCategoryKey>('All');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

  const themeColor = THEME_COLORS.find((color) => color.key === themeColorKey) ?? THEME_COLORS[0];

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

  function formatTaxRate(rate: number | null) {
    return rate === null ? 'Bulunamadi' : `%${rate}`;
  }

  function formatTaxAmount(amount: number | null) {
    return amount === null ? 'Bulunamadi' : `${amount.toFixed(2)} TL`;
  }

  function formatSummaryAmount(amount: number | string | null | undefined) {
    const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
    return typeof numericAmount === 'number' && Number.isFinite(numericAmount) ? `${numericAmount.toFixed(2)} TL` : '0.00 TL';
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

  function getSortedTotals(totals: Record<string, number> | null | undefined) {
    return Object.entries(totals ?? {})
      .map(([label, amount]) => ({ label, amount: Number(amount) }))
      .filter(({ amount }) => Number.isFinite(amount))
      .sort((left, right) => right.amount - left.amount);
  }

  function attachCounts(
    totals: Array<{ label: string; amount: number }>,
    counts: Record<string, number> | null | undefined,
  ) {
    return totals.map((row) => ({
      ...row,
      count: Number(counts?.[row.label] ?? 0),
    }));
  }

  function getSelectedMonthLabel() {
    return MONTH_OPTIONS.find((month) => month.value === selectedAnalysisMonth)?.label ?? String(selectedAnalysisMonth);
  }

  function getCategoryOptions() {
    const categorySet = new Set([
      ...DEFAULT_CATEGORY_OPTIONS,
      ...Object.keys(monthlySummary?.category_totals ?? {}),
      ...Object.keys(yearlySummary?.category_totals ?? {}),
    ]);

    return ['All', ...categorySet];
  }

  function getSelectedCategoryLabel() {
    return selectedAnalysisCategory === 'All' ? 'HEPSI' : selectedAnalysisCategory.toUpperCase();
  }

  function getCategoryAmount(totals: Record<string, number> | null | undefined) {
    if (selectedAnalysisCategory === 'All') {
      return null;
    }

    return Number(totals?.[selectedAnalysisCategory] ?? 0);
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
            <InfoRow label="KDV orani" value={formatTaxRate(parsedReceipt.taxRate)} />
            <InfoRow label="KDV tutari" value={formatTaxAmount(parsedReceipt.taxAmount)} />
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
    const monthlyCategoryTotals = attachCounts(
      getSortedTotals(monthlySummary?.category_totals),
      monthlySummary?.category_counts,
    );
    const yearlyCategoryTotals = attachCounts(
      getSortedTotals(yearlySummary?.category_totals),
      yearlySummary?.category_counts,
    );
    const categoryOptions = getCategoryOptions();
    const filteredMonthlyCategoryTotals =
      selectedAnalysisCategory === 'All'
        ? monthlyCategoryTotals
        : monthlyCategoryTotals.filter((row) => row.label === selectedAnalysisCategory);
    const filteredYearlyCategoryTotals =
      selectedAnalysisCategory === 'All'
        ? yearlyCategoryTotals
        : yearlyCategoryTotals.filter((row) => row.label === selectedAnalysisCategory);
    const selectedMonthlyAmount = getCategoryAmount(monthlySummary?.category_totals);
    const selectedYearlyAmount = getCategoryAmount(yearlySummary?.category_totals);
    const yearlyMonthlyTotals = MONTH_OPTIONS.map((month) => ({
      label: month.label,
      amount: Number(yearlySummary?.monthly_totals?.[String(month.value)] ?? 0),
    })).filter(({ amount }) => amount > 0);

    return (
      <View style={styles.analysisPanel}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>ANALIZ</Text>
            <Text style={styles.sectionSubtitle}>AYLIK VE YILLIK OZETLER</Text>
          </View>
          <Pressable onPress={onRefreshAnalysis} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
            <Text style={[styles.refreshButtonText, { color: themeColor.primary }]}>YENILE</Text>
          </Pressable>
        </View>

        <View style={styles.selectorBlock}>
          <Text style={styles.selectorLabel}>YIL</Text>
          <Pressable
            onPress={() => setOpenAnalysisSelect(openAnalysisSelect === 'year' ? null : 'year')}
            style={[styles.selectButton, { borderColor: openAnalysisSelect === 'year' ? themeColor.primary : '#d8e3dd' }]}
          >
            <Text style={styles.selectButtonText}>{selectedAnalysisYear}</Text>
            <Text style={[styles.selectChevron, { color: themeColor.primary }]}>
              {openAnalysisSelect === 'year' ? '▲' : '▼'}
            </Text>
          </Pressable>
          {openAnalysisSelect === 'year' ? (
            <View style={styles.selectMenu}>
              {YEAR_OPTIONS.map((year) => {
                const isSelected = year === selectedAnalysisYear;

                return (
                  <Pressable
                    key={year}
                    onPress={() => {
                      onSelectAnalysisYear(year);
                      setOpenAnalysisSelect(null);
                    }}
                    style={[styles.selectOption, isSelected && { backgroundColor: themeColor.soft }]}
                  >
                    <Text style={[styles.selectOptionText, isSelected && { color: themeColor.primary }]}>
                      {year}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.selectorBlock}>
          <Text style={styles.selectorLabel}>KATEGORI</Text>
          <Pressable
            onPress={() => setOpenAnalysisSelect(openAnalysisSelect === 'category' ? null : 'category')}
            style={[
              styles.selectButton,
              { borderColor: openAnalysisSelect === 'category' ? themeColor.primary : '#d8e3dd' },
            ]}
          >
            <Text style={styles.selectButtonText}>{getSelectedCategoryLabel()}</Text>
            <Text style={[styles.selectChevron, { color: themeColor.primary }]}>
              {openAnalysisSelect === 'category' ? '▲' : '▼'}
            </Text>
          </Pressable>
          {openAnalysisSelect === 'category' ? (
            <View style={styles.selectMenu}>
              {categoryOptions.map((category) => {
                const isSelected = category === selectedAnalysisCategory;
                const label = category === 'All' ? 'HEPSI' : category.toUpperCase();

                return (
                  <Pressable
                    key={category}
                    onPress={() => {
                      setSelectedAnalysisCategory(category);
                      setOpenAnalysisSelect(null);
                    }}
                    style={[styles.selectOption, isSelected && { backgroundColor: themeColor.soft }]}
                  >
                    <Text style={[styles.selectOptionText, isSelected && { color: themeColor.primary }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.selectorBlock}>
          <Text style={styles.selectorLabel}>AY</Text>
          <Pressable
            onPress={() => setOpenAnalysisSelect(openAnalysisSelect === 'month' ? null : 'month')}
            style={[styles.selectButton, { borderColor: openAnalysisSelect === 'month' ? themeColor.primary : '#d8e3dd' }]}
          >
            <Text style={styles.selectButtonText}>{getSelectedMonthLabel()}</Text>
            <Text style={[styles.selectChevron, { color: themeColor.primary }]}>
              {openAnalysisSelect === 'month' ? '▲' : '▼'}
            </Text>
          </Pressable>
          {openAnalysisSelect === 'month' ? (
            <View style={styles.selectMenu}>
              {MONTH_OPTIONS.map((month) => {
                const isSelected = month.value === selectedAnalysisMonth;

                return (
                  <Pressable
                    key={month.value}
                    onPress={() => {
                      onSelectAnalysisMonth(month.value);
                      setOpenAnalysisSelect(null);
                    }}
                    style={[styles.selectOption, isSelected && { backgroundColor: themeColor.soft }]}
                  >
                    <Text style={[styles.selectOptionText, isSelected && { color: themeColor.primary }]}>
                      {month.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {isLoadingAnalysis ? (
          <View style={styles.processingRow}>
            <ActivityIndicator color={themeColor.primary} />
            <Text style={styles.processingText}>Analiz yukleniyor.</Text>
          </View>
        ) : null}

        {analysisError ? <Text style={styles.errorText}>{analysisError}</Text> : null}

        <View style={styles.metricGrid}>
          <Metric
            label={selectedAnalysisCategory === 'All' ? 'AYLIK TOPLAM' : 'AYLIK KATEGORI'}
            value={formatSummaryAmount(selectedMonthlyAmount ?? monthlySummary?.total_amount)}
          />
          <Metric label="AYLIK FIS" value={String(monthlySummary?.receipt_count ?? 0)} />
          <Metric
            label={selectedAnalysisCategory === 'All' ? 'YILLIK TOPLAM' : 'YILLIK KATEGORI'}
            value={formatSummaryAmount(selectedYearlyAmount ?? yearlySummary?.total_amount)}
          />
          <Metric label="YILLIK FIS" value={String(yearlySummary?.receipt_count ?? 0)} />
        </View>

        <SummaryBreakdown title="AYLIK KATEGORI" rows={filteredMonthlyCategoryTotals} />
        <SummaryBreakdown title="YILLIK KATEGORI" rows={filteredYearlyCategoryTotals} />
        <SummaryBreakdown title="YILLIK AY DAGILIMI" rows={yearlyMonthlyTotals} />
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

function SummaryBreakdown({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; amount: number; count?: number }>;
}) {
  return (
    <View style={styles.breakdownPanel}>
      <Text style={styles.breakdownTitle}>{title}</Text>
      {rows.length === 0 ? <Text style={styles.emptyText}>Bu secim icin veri yok.</Text> : null}
      {rows.map((row) => (
        <View key={row.label} style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>
            {row.count === undefined ? row.label : `${row.label} • ${row.count} FIS`}
          </Text>
          <Text style={styles.breakdownAmount}>{`${row.amount.toFixed(2)} TL`}</Text>
        </View>
      ))}
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
  selectorBlock: {
    gap: 8,
  },
  selectorLabel: {
    color: '#52645d',
    fontSize: 12,
    fontWeight: '900',
  },
  selectButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#f7faf8',
    paddingHorizontal: 12,
  },
  selectButtonText: {
    color: '#12231d',
    fontSize: 15,
    fontWeight: '900',
  },
  selectChevron: {
    fontSize: 12,
    fontWeight: '900',
  },
  selectMenu: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#ffffff',
  },
  selectOption: {
    minHeight: 40,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ef',
    paddingHorizontal: 12,
  },
  selectOptionText: {
    color: '#52645d',
    fontSize: 14,
    fontWeight: '900',
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
  breakdownPanel: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef2ef',
    paddingTop: 12,
  },
  breakdownTitle: {
    color: '#12231d',
    fontSize: 14,
    fontWeight: '900',
  },
  breakdownRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  breakdownLabel: {
    flex: 1,
    color: '#52645d',
    fontSize: 13,
    fontWeight: '800',
  },
  breakdownAmount: {
    color: '#12231d',
    fontSize: 13,
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

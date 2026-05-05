import type { Session } from '@supabase/supabase-js';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { supabase } from '../lib/supabase';
import type { ReceiptOcrResult } from '../services/receiptOcr';
import type { ParsedReceipt } from '../services/receiptParser';
import type {
  MonthlySpendingSummary,
  ReceiptListItem,
  SavedReceipt,
  UpdateReceiptInput,
  YearlySpendingSummary,
} from '../services/receiptRepository';
import type { ReceiptUploadResult } from '../services/receiptUpload';

type TabKey = 'home' | 'entry' | 'receipts' | 'analysis' | 'account';
type ThemeColorKey = 'green' | 'blue' | 'rose' | 'amber';
type AnalysisCategoryKey = 'All' | string;
type EditReceiptForm = {
  id: string;
  merchant: string;
  totalAmount: string;
  taxRate: string;
  date: string;
  category: string;
};
type DraftReceiptForm = Omit<EditReceiptForm, 'id'>;

type CategoryTotalRow = {
  label: string;
  amount: number;
  count?: number;
};

type ChartSegment = CategoryTotalRow & {
  color: string;
  percent: number;
};

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
  onSaveParsedReceipt: (parsedReceipt: ParsedReceipt) => Promise<void>;
  onSelectAnalysisMonth: (month: number) => void;
  onSelectAnalysisYear: (year: number) => void;
  onUpdateReceipt: (input: Omit<UpdateReceiptInput, 'userId'>) => Promise<void>;
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

const TABS: Array<{ key: Exclude<TabKey, 'entry'>; label: string; icon: string }> = [
  { key: 'home', label: 'ANA SAYFA', icon: 'H' },
  { key: 'analysis', label: 'ANALIZ', icon: 'A' },
  { key: 'receipts', label: 'GECMIS', icon: 'G' },
  { key: 'account', label: 'PROFIL', icon: 'P' },
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
const DEFAULT_CATEGORY_OPTIONS = ['Market', 'Food', 'Transport', 'Bills', 'Health', 'Other'];
const CATEGORY_CHART_COLORS: Record<string, string> = {
  Market: '#21725e',
  Food: '#d88722',
  Transport: '#1c5b9b',
  Bills: '#7d4fb8',
  Health: '#b63c5f',
  Other: '#6f7d76',
};

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
  onSaveParsedReceipt,
  onSelectAnalysisMonth,
  onSelectAnalysisYear,
  onUpdateReceipt,
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
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [themeColorKey, setThemeColorKey] = useState<ThemeColorKey>('green');
  const [openAnalysisSelect, setOpenAnalysisSelect] = useState<'year' | 'month' | 'category' | null>(null);
  const [selectedAnalysisCategory, setSelectedAnalysisCategory] = useState<AnalysisCategoryKey>('All');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [editingReceipt, setEditingReceipt] = useState<EditReceiptForm | null>(null);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isUpdatingReceipt, setIsUpdatingReceipt] = useState(false);
  const [draftReceipt, setDraftReceipt] = useState<DraftReceiptForm | null>(null);
  const [draftError, setDraftError] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const themeColor = THEME_COLORS.find((color) => color.key === themeColorKey) ?? THEME_COLORS[0];

  useEffect(() => {
    if (!parsedReceipt || savedReceipt) {
      setDraftReceipt(null);
      setDraftError('');
      return;
    }

    setDraftReceipt({
      merchant: parsedReceipt.merchant ?? '',
      totalAmount: parsedReceipt.totalAmount === null ? '' : String(parsedReceipt.totalAmount),
      taxRate: parsedReceipt.taxRate === null ? '' : String(parsedReceipt.taxRate),
      date: parsedReceipt.date ?? '',
      category: parsedReceipt.category ?? 'Other',
    });
    setDraftError('');
  }, [parsedReceipt, savedReceipt]);

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

  function formatReceiptDate(date: string | null) {
    if (!date) {
      return 'TARIH EKSIK';
    }

    const dateText = date;
    const [year, month, day] = dateText.split('-');

    return year && month && day ? `${day}.${month}.${year}` : dateText;
  }

  function calculateTaxAmount(totalAmount: number, taxRate: number | null) {
    if (taxRate === null || taxRate <= 0) {
      return 0;
    }

    return Number(((totalAmount * taxRate) / (100 + taxRate)).toFixed(2));
  }

  function getTaxAmountPreview(totalAmountText: string, taxRateText: string) {
    const totalAmount = parseDecimalInput(totalAmountText, 'Tutar', { allowThrow: false });
    const taxRate = parseDecimalInput(taxRateText, 'KDV orani', { required: false, allowThrow: false });

    if (totalAmount === null || totalAmount <= 0 || taxRate === null || taxRate < 0 || taxRate > 100) {
      return 'KDV orani girilince otomatik hesaplanir.';
    }

    return `${calculateTaxAmount(totalAmount, taxRate).toFixed(2)} TL`;
  }

  function parseDecimalInput(
    value: string,
    fieldName: string,
    { required = true, allowThrow = true } = {},
  ) {
    const normalizedValue = value.trim().replace(',', '.');

    if (!normalizedValue) {
      if (required) {
        if (!allowThrow) {
          return null;
        }

        throw new Error(`${fieldName} bos birakilamaz.`);
      }

      return null;
    }

    const numericValue = Number(normalizedValue);

    if (!Number.isFinite(numericValue)) {
      if (!allowThrow) {
        return null;
      }

      throw new Error(`${fieldName} sayisal olmali.`);
    }

    return numericValue;
  }

  function startEditingReceipt(receipt: ReceiptListItem) {
    setEditError('');
    setEditSuccess('');
    setEditingReceipt({
      id: receipt.id,
      merchant: receipt.merchant ?? '',
      totalAmount: receipt.total_amount === null ? '' : String(receipt.total_amount),
      taxRate: receipt.tax_rate === null ? '' : String(receipt.tax_rate),
      date: receipt.date ?? '',
      category: receipt.category ?? 'Other',
    });
  }

  function updateEditingReceipt(field: keyof EditReceiptForm, value: string) {
    setEditingReceipt((currentForm) => (currentForm ? { ...currentForm, [field]: value } : currentForm));
    setEditError('');
    setEditSuccess('');
  }

  function updateDraftReceipt(field: keyof DraftReceiptForm, value: string) {
    setDraftReceipt((currentForm) => (currentForm ? { ...currentForm, [field]: value } : currentForm));
    setDraftError('');
  }

  async function handleSaveEditedReceipt() {
    if (!editingReceipt) {
      return;
    }

    const merchant = editingReceipt.merchant.trim();
    const category = editingReceipt.category.trim();
    const date = editingReceipt.date.trim();

    try {
      if (!merchant) {
        throw new Error('Magaza bos birakilamaz.');
      }

      if (!category) {
        throw new Error('Kategori bos birakilamaz.');
      }

      if (!date) {
        throw new Error('Tarih bos birakilamaz.');
      }

      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Tarih YYYY-AA-GG formatinda olmali.');
      }

      const totalAmount = parseDecimalInput(editingReceipt.totalAmount, 'Tutar');
      const taxRate = parseDecimalInput(editingReceipt.taxRate, 'KDV orani', { required: false });

      if (totalAmount === null || totalAmount <= 0) {
        throw new Error('Tutar sifirdan buyuk olmali.');
      }

      if (taxRate !== null && (taxRate < 0 || taxRate > 100)) {
        throw new Error('KDV orani 0 ile 100 arasinda olmali.');
      }

      const taxAmount = calculateTaxAmount(totalAmount, taxRate);

      setIsUpdatingReceipt(true);
      setEditError('');
      setEditSuccess('');

      await onUpdateReceipt({
        id: editingReceipt.id,
        merchant,
        totalAmount,
        taxAmount,
        taxRate,
        date,
        category,
      });

      setEditSuccess('FIS GUNCELLENDI.');
      setEditingReceipt(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Fis guncellenemedi.');
    } finally {
      setIsUpdatingReceipt(false);
    }
  }

  async function handleSaveDraftReceipt() {
    if (!draftReceipt || !parsedReceipt) {
      return;
    }

    const merchant = draftReceipt.merchant.trim();
    const category = draftReceipt.category.trim();
    const date = draftReceipt.date.trim();

    try {
      if (!merchant) {
        throw new Error('Magaza bos birakilamaz.');
      }

      if (!category) {
        throw new Error('Kategori bos birakilamaz.');
      }

      if (!date) {
        throw new Error('Tarih bos birakilamaz.');
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Tarih YYYY-AA-GG formatinda olmali.');
      }

      const totalAmount = parseDecimalInput(draftReceipt.totalAmount, 'Tutar');
      const taxRate = parseDecimalInput(draftReceipt.taxRate, 'KDV orani', { required: false });

      if (totalAmount === null || totalAmount <= 0) {
        throw new Error('Tutar sifirdan buyuk olmali.');
      }

      if (taxRate !== null && (taxRate < 0 || taxRate > 100)) {
        throw new Error('KDV orani 0 ile 100 arasinda olmali.');
      }

      const taxAmount = calculateTaxAmount(totalAmount, taxRate);

      setIsSavingDraft(true);
      setDraftError('');

      await onSaveParsedReceipt({
        ...parsedReceipt,
        merchant,
        totalAmount,
        taxAmount,
        taxRate,
        taxBreakdown:
          taxRate === null || taxRate <= 0
            ? []
            : [{ rate: taxRate, amount: taxAmount, totalWithTax: totalAmount }],
        date,
        category,
      });
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'Fis kaydedilemedi.');
    } finally {
      setIsSavingDraft(false);
    }
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

  function getCategoryColor(category: string) {
    return CATEGORY_CHART_COLORS[category] ?? CATEGORY_CHART_COLORS.Other;
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

  function getDashboardInsight(rows: CategoryTotalRow[], totalAmount: number) {
    const topCategory = rows[0];

    if (!topCategory || totalAmount <= 0) {
      return 'BU SECIM ICIN HENUZ ANALIZ VERISI YOK.';
    }

    const topPercent = Math.round((topCategory.amount / totalAmount) * 100);
    return `HARCAMANIN %${topPercent} KISMI ${topCategory.label.toUpperCase()} KATEGORISINDE.`;
  }

  function renderHomeTab() {
    const monthlyCategoryTotals = attachCounts(
      getSortedTotals(monthlySummary?.category_totals),
      monthlySummary?.category_counts,
    );
    const monthlyChartSegments = monthlyCategoryTotals.map((row) => ({
      ...row,
      color: getCategoryColor(row.label),
      percent: monthlySummary?.total_amount ? row.amount / monthlySummary.total_amount : 0,
    }));

    return (
      <>
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.homeGreeting}>MERHABA,</Text>
            <Text style={styles.homeTitle}>{session?.user.email?.split('@')[0] ?? 'FISHAPP'}</Text>
          </View>
          <View style={styles.notificationButton}>
            <Text style={[styles.notificationIcon, { color: themeColor.primary }]}>!</Text>
          </View>
        </View>

        <View style={styles.periodSwitcher}>
          {['GUN', 'HAFTA', 'AY', 'YIL'].map((period) => {
            const isSelected = period === 'AY';

            return (
              <View
                key={period}
                style={[
                  styles.periodOption,
                  isSelected && { backgroundColor: themeColor.primary },
                ]}
              >
                <Text style={[styles.periodText, isSelected && styles.periodTextActive]}>{period}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.homeDashboardCard}>
          <View style={styles.homeDashboardTop}>
            <View>
              <Text style={styles.dashboardEyebrow}>BU AY TOPLAM HARCAMA</Text>
              <Text style={styles.homeDashboardAmount}>{formatSummaryAmount(monthlySummary?.total_amount)}</Text>
            </View>
            <View style={styles.trendPill}>
              <Text style={[styles.trendPillText, { color: themeColor.primary }]}>-8.2%</Text>
            </View>
          </View>

          <PieChart segments={monthlyChartSegments} totalLabel={formatSummaryAmount(monthlySummary?.total_amount)} />

          <View style={styles.chartLegend}>
            {monthlyCategoryTotals.slice(0, 6).map((row) => (
              <View key={row.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: getCategoryColor(row.label) }]} />
                <Text style={styles.legendText}>{row.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.homeCategoryCard}>
          <Text style={styles.breakdownTitle}>KATEGORI DAGILIMI</Text>
          {monthlyCategoryTotals.length === 0 ? <Text style={styles.emptyText}>Bu ay icin henuz veri yok.</Text> : null}
          {monthlyCategoryTotals.slice(0, 5).map((row) => (
            <HomeCategoryRow
              key={row.label}
              color={getCategoryColor(row.label)}
              row={row}
              totalAmount={monthlySummary?.total_amount ?? 0}
            />
          ))}
        </View>
      </>
    );
  }

  function renderEntryTab() {
    return (
      <>
        <View style={styles.uploadHeader}>
          <Pressable onPress={() => setActiveTab('home')} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: themeColor.primary }]}>{'<'}</Text>
          </Pressable>
          <Text style={styles.title}>FIS YUKLE</Text>
        </View>

        <View style={styles.uploadDropzone}>
          <View style={[styles.uploadIconBox, { backgroundColor: themeColor.soft }]}>
            <Text style={[styles.uploadIconText, { color: themeColor.primary }]}>F</Text>
          </View>
          <Text style={styles.uploadDropTitle}>FISINI BURAYA EKLE</Text>
          <Text style={styles.uploadDropSubtitle}>PNG, JPG VEYA PDF - MAKS. 10 MB</Text>
          <Pressable
            onPress={onPickPhoto}
            style={({ pressed }) => [
              styles.fileSelectButton,
              { backgroundColor: themeColor.soft },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.fileSelectButtonText, { color: themeColor.primary }]}>DOSYA SEC</Text>
          </Pressable>
        </View>

        <View style={styles.uploadDividerRow}>
          <View style={styles.uploadDivider} />
          <Text style={styles.uploadDividerText}>VEYA</Text>
          <View style={styles.uploadDivider} />
        </View>

        <View style={styles.uploadActionGrid}>
          <Pressable
            onPress={onOpenCamera}
            style={({ pressed }) => [
              styles.uploadActionCardPrimary,
              { backgroundColor: themeColor.primary },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.uploadActionIconPrimary}>
              <Text style={styles.uploadActionIconTextPrimary}>C</Text>
            </View>
            <Text style={styles.uploadActionTitlePrimary}>FOTOGRAF CEK</Text>
            <Text style={styles.uploadActionSubtitlePrimary}>KAMERAYI KULLAN</Text>
          </Pressable>

          <Pressable
            onPress={onPickPhoto}
            style={({ pressed }) => [
              styles.uploadActionCardSecondary,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.uploadActionIconSecondary, { backgroundColor: themeColor.soft }]}>
              <Text style={[styles.uploadActionIconTextSecondary, { color: themeColor.primary }]}>G</Text>
            </View>
            <Text style={styles.uploadActionTitleSecondary}>GALERIDEN SEC</Text>
            <Text style={styles.uploadActionSubtitleSecondary}>FOTOGRAF SEC</Text>
          </Pressable>
        </View>

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

        {parsedReceipt && !savedReceipt && draftReceipt ? (
          <View style={styles.editPanel}>
            <View>
              <Text style={styles.sectionTitle}>KAYIT ONCESI KONTROL</Text>
              <Text style={styles.sectionSubtitle}>EKSIK VEYA HATALI OCR BILGISINI TAMAMLA</Text>
            </View>

            <Text style={styles.inputLabel}>MAGAZA</Text>
            <TextInput
              autoCapitalize="characters"
              onChangeText={(value) => updateDraftReceipt('merchant', value)}
              placeholder="MAGAZA ADI"
              style={styles.editInput}
              value={draftReceipt.merchant}
            />

            <View style={styles.editInputGrid}>
              <View style={styles.editInputColumn}>
                <Text style={styles.inputLabel}>TUTAR</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateDraftReceipt('totalAmount', value)}
                  placeholder="0.00"
                  style={styles.editInput}
                  value={draftReceipt.totalAmount}
                />
              </View>
              <View style={styles.editInputColumn}>
                <Text style={styles.inputLabel}>TARIH</Text>
                <TextInput
                  keyboardType="numbers-and-punctuation"
                  onChangeText={(value) => updateDraftReceipt('date', value)}
                  placeholder="YYYY-AA-GG"
                  style={styles.editInput}
                  value={draftReceipt.date}
                />
              </View>
            </View>

            <View style={styles.editInputGrid}>
              <View style={styles.editInputColumn}>
                <Text style={styles.inputLabel}>KDV TUTARI</Text>
                <View style={styles.computedInput}>
                  <Text style={styles.computedInputText}>
                    {getTaxAmountPreview(draftReceipt.totalAmount, draftReceipt.taxRate)}
                  </Text>
                </View>
              </View>
              <View style={styles.editInputColumn}>
                <Text style={styles.inputLabel}>KDV ORANI</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateDraftReceipt('taxRate', value)}
                  placeholder="0"
                  style={styles.editInput}
                  value={draftReceipt.taxRate}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>KATEGORI</Text>
            <View style={styles.categoryChoiceGrid}>
              {getCategoryOptions()
                .filter((category) => category !== 'All')
                .map((category) => {
                  const isSelected = draftReceipt.category === category;

                  return (
                    <Pressable
                      key={category}
                      onPress={() => updateDraftReceipt('category', category)}
                      style={[
                        styles.categoryChoice,
                        {
                          backgroundColor: isSelected ? themeColor.primary : '#f7faf8',
                          borderColor: isSelected ? themeColor.primary : '#d8e3dd',
                        },
                      ]}
                    >
                      <Text style={[styles.categoryChoiceText, isSelected && styles.categoryChoiceTextActive]}>
                        {category.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>

            {draftError ? <Text style={styles.errorText}>{draftError}</Text> : null}

            <Pressable
              disabled={isSavingDraft || isSavingReceipt}
              onPress={handleSaveDraftReceipt}
              style={({ pressed }) => [
                styles.editSaveButton,
                { backgroundColor: themeColor.primary },
                pressed && styles.pressed,
                (isSavingDraft || isSavingReceipt) && styles.disabled,
              ]}
            >
              {isSavingDraft || isSavingReceipt ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.editSaveButtonText}>KONTROL ET VE KAYDET</Text>
              )}
            </Pressable>
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
    const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.total_amount ?? 0), 0);
    const averageAmount = receipts.length > 0 ? totalAmount / receipts.length : 0;

    return (
      <>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>FISLERIM</Text>
          <Pressable onPress={onRefreshReceipts} style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}>
            <Text style={[styles.filterButtonText, { color: themeColor.primary }]}>FILTRELE</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>S</Text>
          <Text style={styles.searchPlaceholder}>FIS VEYA SIRKET ARA...</Text>
        </View>

        <View style={styles.receiptStatsRow}>
          <MiniStat label="BU AY" value={`${receipts.length} FIS`} color={themeColor.primary} />
          <MiniStat label="TOPLAM" value={formatSummaryAmount(totalAmount)} color={themeColor.primary} />
          <MiniStat label="ORTALAMA" value={formatSummaryAmount(averageAmount)} color="#d88722" />
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

        {editSuccess ? <Text style={[styles.successText, { color: themeColor.primary }]}>{editSuccess}</Text> : null}
        {editError ? <Text style={styles.errorText}>{editError}</Text> : null}

        {editingReceipt ? (
          <View style={styles.editPanel}>
            <View style={styles.editPanelHeader}>
              <View>
                <Text style={styles.sectionTitle}>FIS DUZENLE</Text>
                <Text style={styles.sectionSubtitle}>OCR HATALARINI BURADAN DUZELT</Text>
              </View>
              <Pressable
                disabled={isUpdatingReceipt}
                onPress={() => {
                  setEditingReceipt(null);
                  setEditError('');
                }}
                style={({ pressed }) => [styles.editCancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.editCancelButtonText}>VAZGEC</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>MAGAZA</Text>
            <TextInput
              autoCapitalize="characters"
              onChangeText={(value) => updateEditingReceipt('merchant', value)}
              placeholder="MAGAZA ADI"
              style={styles.editInput}
              value={editingReceipt.merchant}
            />

            <View style={styles.editInputGrid}>
              <View style={styles.editInputColumn}>
                <Text style={styles.inputLabel}>TUTAR</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateEditingReceipt('totalAmount', value)}
                  placeholder="0.00"
                  style={styles.editInput}
                  value={editingReceipt.totalAmount}
                />
              </View>
              <View style={styles.editInputColumn}>
                <Text style={styles.inputLabel}>TARIH</Text>
                <TextInput
                  keyboardType="numbers-and-punctuation"
                  onChangeText={(value) => updateEditingReceipt('date', value)}
                  placeholder="YYYY-AA-GG"
                  style={styles.editInput}
                  value={editingReceipt.date}
                />
              </View>
            </View>

            <View style={styles.editInputGrid}>
              <View style={styles.editInputColumn}>
                <Text style={styles.inputLabel}>KDV TUTARI</Text>
                <View style={styles.computedInput}>
                  <Text style={styles.computedInputText}>
                    {getTaxAmountPreview(editingReceipt.totalAmount, editingReceipt.taxRate)}
                  </Text>
                </View>
              </View>
              <View style={styles.editInputColumn}>
                <Text style={styles.inputLabel}>KDV ORANI</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateEditingReceipt('taxRate', value)}
                  placeholder="20"
                  style={styles.editInput}
                  value={editingReceipt.taxRate}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>KATEGORI</Text>
            <View style={styles.categoryChoiceGrid}>
              {getCategoryOptions()
                .filter((category) => category !== 'All')
                .map((category) => {
                  const isSelected = editingReceipt.category === category;

                  return (
                    <Pressable
                      key={category}
                      onPress={() => updateEditingReceipt('category', category)}
                      style={[
                        styles.categoryChoice,
                        {
                          backgroundColor: isSelected ? themeColor.primary : '#f7faf8',
                          borderColor: isSelected ? themeColor.primary : '#d8e3dd',
                        },
                      ]}
                    >
                      <Text style={[styles.categoryChoiceText, isSelected && styles.categoryChoiceTextActive]}>
                        {category.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>

            <Pressable
              disabled={isUpdatingReceipt}
              onPress={handleSaveEditedReceipt}
              style={({ pressed }) => [
                styles.editSaveButton,
                { backgroundColor: themeColor.primary },
                pressed && styles.pressed,
                isUpdatingReceipt && styles.disabled,
              ]}
            >
              {isUpdatingReceipt ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.editSaveButtonText}>KAYDET</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.receiptList}>
          {receipts.map((receipt) => {
            const categoryStyle = getCategoryStyle(receipt.category);

            return (
              <View key={receipt.id} style={styles.receiptCard}>
                <View style={[styles.categoryIcon, { backgroundColor: categoryStyle.backgroundColor }]}>
                  <Text style={[styles.categoryIconText, { color: categoryStyle.color }]}>{categoryStyle.icon}</Text>
                </View>
                <View style={styles.receiptMain}>
                  <Text numberOfLines={1} style={styles.receiptMerchant}>
                    {receipt.merchant ?? 'Bilinmeyen magaza'}
                  </Text>
                  <Text style={[styles.receiptCategoryPill, { color: themeColor.primary, backgroundColor: themeColor.soft }]}>
                    {receipt.category ?? 'Other'}
                  </Text>
                  <Text style={styles.receiptDate}>{formatReceiptDate(receipt.date)}</Text>
                </View>
                <View style={styles.receiptAmountBox}>
                  <Text style={styles.receiptAmount}>{formatReceiptAmount(receipt.total_amount)}</Text>
                  <Text style={styles.receiptTax}>KDV: {formatTaxAmount(receipt.tax_amount)}</Text>
                  <Pressable
                    onPress={() => startEditingReceipt(receipt)}
                    style={({ pressed }) => [
                      styles.receiptEditButton,
                      { borderColor: themeColor.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.receiptEditButtonText, { color: themeColor.primary }]}>DUZENLE</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </>
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
    const activeMonthlyAmount = selectedMonthlyAmount ?? monthlySummary?.total_amount ?? 0;
    const activeYearlyAmount = selectedYearlyAmount ?? yearlySummary?.total_amount ?? 0;
    const activeMonthlyCount =
      selectedAnalysisCategory === 'All'
        ? monthlySummary?.receipt_count ?? 0
        : Number(monthlySummary?.category_counts?.[selectedAnalysisCategory] ?? 0);
    const activeYearlyCount =
      selectedAnalysisCategory === 'All'
        ? yearlySummary?.receipt_count ?? 0
        : Number(yearlySummary?.category_counts?.[selectedAnalysisCategory] ?? 0);
    const monthlyChartSegments = monthlyCategoryTotals.map((row) => ({
      ...row,
      color: getCategoryColor(row.label),
      percent: monthlySummary?.total_amount ? row.amount / monthlySummary.total_amount : 0,
    }));
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
              {openAnalysisSelect === 'year' ? '^' : 'v'}
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
              {openAnalysisSelect === 'category' ? '^' : 'v'}
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
              {openAnalysisSelect === 'month' ? '^' : 'v'}
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

        <View style={[styles.dashboardHero, { backgroundColor: themeColor.soft }]}>
          <View style={styles.dashboardHeroText}>
            <Text style={[styles.dashboardEyebrow, { color: themeColor.primary }]}>
              {selectedAnalysisCategory === 'All' ? 'AYLIK TOPLAM HARCAMA' : `${getSelectedCategoryLabel()} AYLIK`}
            </Text>
            <Text style={styles.dashboardTotal}>{formatSummaryAmount(activeMonthlyAmount)}</Text>
            <Text style={styles.dashboardMeta}>
              {`${activeMonthlyCount} FIS - ${getSelectedMonthLabel()} ${selectedAnalysisYear}`}
            </Text>
          </View>
          <View style={styles.dashboardYearPill}>
            <Text style={styles.dashboardYearLabel}>YILLIK</Text>
            <Text style={styles.dashboardYearValue}>{formatSummaryAmount(activeYearlyAmount)}</Text>
            <Text style={styles.dashboardYearCount}>{`${activeYearlyCount} FIS`}</Text>
          </View>
        </View>

        <View style={styles.chartPanel}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.breakdownTitle}>KATEGORI DAGILIMI</Text>
              <Text style={styles.chartSubtitle}>{`${getSelectedMonthLabel()} ${selectedAnalysisYear}`}</Text>
            </View>
            <Text style={[styles.chartTotal, { color: themeColor.primary }]}>
              {formatSummaryAmount(monthlySummary?.total_amount)}
            </Text>
          </View>
          <PieChart segments={monthlyChartSegments} />
          <Text style={styles.insightText}>
            {getDashboardInsight(monthlyCategoryTotals, monthlySummary?.total_amount ?? 0)}
          </Text>
        </View>

        <View style={styles.categoryCardGrid}>
          {filteredMonthlyCategoryTotals.length === 0 ? <Text style={styles.emptyText}>Bu secim icin veri yok.</Text> : null}
          {filteredMonthlyCategoryTotals.map((row) => (
            <CategoryDashboardCard
              key={row.label}
              color={getCategoryColor(row.label)}
              row={row}
              totalAmount={monthlySummary?.total_amount ?? 0}
            />
          ))}
        </View>

        <View style={styles.metricGrid}>
          <Metric label="AYLIK FIS" value={String(activeMonthlyCount)} />
          <Metric label="YILLIK FIS" value={String(activeYearlyCount)} />
        </View>

        <SummaryBreakdown title="YILLIK KATEGORI" rows={filteredYearlyCategoryTotals} />
        <SummaryBreakdown title="YILLIK AY DAGILIMI" rows={yearlyMonthlyTotals} />
      </View>
    );
  }

  function renderAccountTab() {
    const monthlyTotal = Number(monthlySummary?.total_amount ?? 0);
    const budget = 5000;
    const saved = Math.max(budget - monthlyTotal, 0);
    const savedPercent = Math.round((saved / budget) * 100);

    return (
      <>
        <Text style={styles.title}>PROFILIM</Text>

        <View style={styles.profileCard}>
          <View style={[styles.profileAvatar, { backgroundColor: themeColor.primary }]}>
            <Text style={styles.profileAvatarText}>{(session?.user.email ?? 'F').slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{session?.user.email?.split('@')[0] ?? 'FishApp Kullanici'}</Text>
            <Text style={styles.profileEmail}>{session?.user.email ?? 'DEMO MODU'}</Text>
            <Text style={[styles.profileBadge, { color: themeColor.primary }]}>PRO UYE</Text>
          </View>
        </View>

        <View style={styles.budgetCard}>
          <Text style={styles.breakdownTitle}>AYLIK BUTCE TASARRUFU</Text>
          <View style={styles.budgetContent}>
            <View style={[styles.budgetGauge, { backgroundColor: themeColor.soft }]}>
              <Text style={[styles.budgetGaugeValue, { color: themeColor.primary }]}>{`%${savedPercent}`}</Text>
              <Text style={styles.budgetGaugeLabel}>TASARRUF</Text>
            </View>
            <View style={styles.budgetRows}>
              <InfoRow label="Butce" value={formatSummaryAmount(budget)} />
              <InfoRow label="Harcanan" value={formatSummaryAmount(monthlyTotal)} />
              <InfoRow label="Tasarruf" value={formatSummaryAmount(saved)} />
            </View>
          </View>
        </View>

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
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {activeTab === 'home' ? renderHomeTab() : null}
        {activeTab === 'entry' ? renderEntryTab() : null}
        {activeTab === 'receipts' ? renderReceiptsTab() : null}
        {activeTab === 'analysis' ? renderAnalysisTab() : null}
        {activeTab === 'account' ? renderAccountTab() : null}
      </ScrollView>

      <View style={styles.tabBar}>
        {TABS.slice(0, 2).map((tab) => (
          <TabButton key={tab.key} activeTab={activeTab} tab={tab} themeColor={themeColor} onPress={() => setActiveTab(tab.key)} />
        ))}
        <Pressable
          onPress={() => setActiveTab('entry')}
          style={({ pressed }) => [
            styles.centerActionButton,
            { backgroundColor: themeColor.primary },
            activeTab === 'entry' && styles.centerActionButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.centerActionText}>+</Text>
        </Pressable>
        {TABS.slice(2).map((tab) => (
          <TabButton key={tab.key} activeTab={activeTab} tab={tab} themeColor={themeColor} onPress={() => setActiveTab(tab.key)} />
        ))}
      </View>
    </View>
  );
}

function TabButton({
  activeTab,
  onPress,
  tab,
  themeColor,
}: {
  activeTab: TabKey;
  onPress: () => void;
  tab: { key: Exclude<TabKey, 'entry'>; label: string; icon: string };
  themeColor: ThemeColor;
}) {
  const isActive = activeTab === tab.key;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <Text style={[styles.tabIcon, isActive && { color: themeColor.primary }]}>{tab.icon}</Text>
      <Text style={[styles.tabButtonText, isActive && { color: themeColor.primary }]}>{tab.label}</Text>
    </Pressable>
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

function MiniStat({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
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
            {row.count === undefined ? row.label : `${row.label} - ${row.count} FIS`}
          </Text>
          <Text style={styles.breakdownAmount}>{`${row.amount.toFixed(2)} TL`}</Text>
        </View>
      ))}
    </View>
  );
}

function PieChart({ segments, totalLabel }: { segments: ChartSegment[]; totalLabel?: string }) {
  const size = 164;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const visibleSegments = segments.filter((segment) => segment.amount > 0 && segment.percent > 0);

  return (
    <View style={styles.pieChartWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#eef2ef" strokeWidth={strokeWidth} fill="none" />
          {visibleSegments.map((segment) => {
            const dashLength = Math.max(segment.percent * circumference, 0);
            const dashOffset = -offset;
            offset += dashLength;

            return (
              <Circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
        </G>
      </Svg>
      <View style={styles.pieChartCenter}>
        <Text style={styles.pieChartCenterLabel}>{totalLabel ? 'TOPLAM' : 'KATEGORI'}</Text>
        <Text style={totalLabel ? styles.pieChartCenterAmount : styles.pieChartCenterValue}>
          {totalLabel ?? visibleSegments.length}
        </Text>
      </View>
    </View>
  );
}

function HomeCategoryRow({
  color,
  row,
  totalAmount,
}: {
  color: string;
  row: CategoryTotalRow;
  totalAmount: number;
}) {
  const percent = totalAmount > 0 ? Math.round((row.amount / totalAmount) * 100) : 0;

  return (
    <View style={styles.homeCategoryRow}>
      <View style={[styles.homeCategoryIcon, { backgroundColor: `${color}18` }]}>
        <Text style={[styles.homeCategoryIconText, { color }]}>{row.label.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.homeCategoryMain}>
        <View style={styles.homeCategoryTop}>
          <Text style={styles.homeCategoryName}>{row.label}</Text>
          <Text style={styles.homeCategoryAmount}>{`${row.amount.toFixed(2)} TL`}</Text>
        </View>
        <View style={styles.homeProgressTrack}>
          <View style={[styles.homeProgressFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.homeCategoryPercent}>{`%${percent}`}</Text>
      </View>
    </View>
  );
}

function CategoryDashboardCard({
  color,
  row,
  totalAmount,
}: {
  color: string;
  row: CategoryTotalRow;
  totalAmount: number;
}) {
  const percent = totalAmount > 0 ? Math.round((row.amount / totalAmount) * 100) : 0;

  return (
    <View style={styles.categoryCard}>
      <View style={[styles.categoryAccent, { backgroundColor: color }]} />
      <View style={styles.categoryCardMain}>
        <View style={styles.categoryCardHeader}>
          <Text style={styles.categoryCardTitle}>{row.label.toUpperCase()}</Text>
          <Text style={[styles.categoryPercent, { color }]}>{`%${percent}`}</Text>
        </View>
        <Text style={styles.categoryCardAmount}>{`${row.amount.toFixed(2)} TL`}</Text>
        <Text style={styles.categoryCardMeta}>{`${row.count ?? 0} FIS`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#eefaf4',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 52,
    paddingBottom: 116,
    backgroundColor: '#eefaf4',
  },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 22,
  },
  homeGreeting: {
    color: '#9aa9b8',
    fontSize: 13,
    fontWeight: '800',
  },
  homeTitle: {
    color: '#06152b',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#f4fff8',
    borderWidth: 1,
    borderColor: '#d8f5e3',
  },
  notificationIcon: {
    fontSize: 18,
    fontWeight: '900',
  },
  periodSwitcher: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    padding: 6,
    marginBottom: 16,
  },
  periodOption: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  periodText: {
    color: '#9aa9b8',
    fontSize: 13,
    fontWeight: '900',
  },
  periodTextActive: {
    color: '#ffffff',
  },
  homeDashboardCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 14,
    marginBottom: 16,
    shadowColor: '#0b5931',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  homeDashboardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  homeDashboardAmount: {
    color: '#06152b',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
  },
  trendPill: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#eefaf4',
    paddingHorizontal: 12,
  },
  trendPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
  },
  homeCategoryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    paddingTop: 16,
    overflow: 'hidden',
    shadowColor: '#0b5931',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  homeCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f4f2',
    padding: 16,
  },
  homeCategoryIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  homeCategoryIconText: {
    fontSize: 16,
    fontWeight: '900',
  },
  homeCategoryMain: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  homeCategoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  homeCategoryName: {
    flex: 1,
    color: '#06152b',
    fontSize: 14,
    fontWeight: '900',
  },
  homeCategoryAmount: {
    color: '#06152b',
    fontSize: 13,
    fontWeight: '900',
  },
  homeProgressTrack: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#eef2ef',
  },
  homeProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  homeCategoryPercent: {
    color: '#9aa9b8',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
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
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#f4fff8',
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: '900',
  },
  uploadDropzone: {
    minHeight: 238,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#68d991',
    backgroundColor: '#f4fff8',
    padding: 22,
  },
  uploadIconBox: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  uploadIconText: {
    fontSize: 24,
    fontWeight: '900',
  },
  uploadDropTitle: {
    color: '#06152b',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  uploadDropSubtitle: {
    color: '#9aa9b8',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  fileSelectButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 18,
  },
  fileSelectButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  uploadDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 26,
  },
  uploadDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#d8e3dd',
  },
  uploadDividerText: {
    color: '#9aa9b8',
    fontSize: 11,
    fontWeight: '800',
  },
  uploadActionGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  uploadActionCardPrimary: {
    flex: 1,
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#0b5931',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  uploadActionCardSecondary: {
    flex: 1,
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    padding: 14,
    shadowColor: '#0b5931',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  uploadActionIconPrimary: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  uploadActionIconSecondary: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  uploadActionIconTextPrimary: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '900',
  },
  uploadActionIconTextSecondary: {
    fontSize: 21,
    fontWeight: '900',
  },
  uploadActionTitlePrimary: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  uploadActionSubtitlePrimary: {
    color: '#e4fff0',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  uploadActionTitleSecondary: {
    color: '#06152b',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  uploadActionSubtitleSecondary: {
    color: '#9aa9b8',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 12,
    shadowColor: '#0b5931',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#f4fff8',
    paddingHorizontal: 14,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },
  searchBox: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#f4fff8',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchIcon: {
    color: '#9aa9b8',
    fontSize: 14,
    fontWeight: '900',
  },
  searchPlaceholder: {
    color: '#9aa9b8',
    fontSize: 13,
    fontWeight: '800',
  },
  receiptStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  miniStat: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    shadowColor: '#0b5931',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  miniStatValue: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  miniStatLabel: {
    marginTop: 4,
    color: '#9aa9b8',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
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
  receiptList: {
    gap: 12,
  },
  receiptCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    padding: 14,
    shadowColor: '#0b5931',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
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
  receiptCategoryPill: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '900',
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
  receiptAmountBox: {
    alignItems: 'flex-end',
    gap: 6,
  },
  receiptTax: {
    color: '#9aa9b8',
    fontSize: 10,
    fontWeight: '900',
  },
  receiptEditButton: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
  },
  receiptEditButtonText: {
    fontSize: 10,
    fontWeight: '900',
  },
  editPanel: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 10,
    shadowColor: '#0b5931',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  editPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  editCancelButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#f7faf8',
    paddingHorizontal: 12,
  },
  editCancelButtonText: {
    color: '#52645d',
    fontSize: 11,
    fontWeight: '900',
  },
  inputLabel: {
    marginTop: 4,
    color: '#52645d',
    fontSize: 11,
    fontWeight: '900',
  },
  editInput: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#f7faf8',
    color: '#12231d',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
  },
  computedInput: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    backgroundColor: '#eef2ef',
    paddingHorizontal: 12,
  },
  computedInputText: {
    color: '#52645d',
    fontSize: 13,
    fontWeight: '800',
  },
  editInputGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  editInputColumn: {
    flex: 1,
    gap: 6,
  },
  categoryChoiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChoice: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  categoryChoiceText: {
    color: '#52645d',
    fontSize: 11,
    fontWeight: '900',
  },
  categoryChoiceTextActive: {
    color: '#ffffff',
  },
  editSaveButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    marginTop: 6,
  },
  editSaveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  analysisPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 14,
    shadowColor: '#0b5931',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
  dashboardHero: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 8,
    padding: 14,
  },
  dashboardHeroText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 6,
  },
  dashboardEyebrow: {
    fontSize: 12,
    fontWeight: '900',
  },
  dashboardTotal: {
    color: '#12231d',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  dashboardMeta: {
    color: '#52645d',
    fontSize: 13,
    fontWeight: '800',
  },
  dashboardYearPill: {
    minWidth: 104,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 10,
    gap: 4,
  },
  dashboardYearLabel: {
    color: '#52645d',
    fontSize: 11,
    fontWeight: '900',
  },
  dashboardYearValue: {
    color: '#12231d',
    fontSize: 14,
    fontWeight: '900',
  },
  dashboardYearCount: {
    color: '#52645d',
    fontSize: 12,
    fontWeight: '800',
  },
  chartPanel: {
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eef2ef',
    backgroundColor: '#fbfdfb',
    padding: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  chartSubtitle: {
    marginTop: 4,
    color: '#52645d',
    fontSize: 12,
    fontWeight: '800',
  },
  chartTotal: {
    color: '#21725e',
    fontSize: 13,
    fontWeight: '900',
  },
  pieChartWrap: {
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartCenterLabel: {
    color: '#52645d',
    fontSize: 10,
    fontWeight: '900',
  },
  pieChartCenterValue: {
    color: '#12231d',
    fontSize: 24,
    fontWeight: '900',
  },
  pieChartCenterAmount: {
    color: '#06152b',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  insightText: {
    color: '#12231d',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
  },
  categoryCardGrid: {
    gap: 10,
  },
  categoryCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eef2ef',
    backgroundColor: '#ffffff',
  },
  categoryAccent: {
    width: 6,
  },
  categoryCardMain: {
    flex: 1,
    gap: 6,
    padding: 12,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryCardTitle: {
    flex: 1,
    color: '#52645d',
    fontSize: 12,
    fontWeight: '900',
  },
  categoryPercent: {
    fontSize: 13,
    fontWeight: '900',
  },
  categoryCardAmount: {
    color: '#12231d',
    fontSize: 18,
    fontWeight: '900',
  },
  categoryCardMeta: {
    color: '#52645d',
    fontSize: 12,
    fontWeight: '800',
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 12,
    shadowColor: '#0b5931',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    padding: 18,
    marginTop: 18,
    marginBottom: 16,
    shadowColor: '#0b5931',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  profileAvatar: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  profileAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  profileName: {
    color: '#06152b',
    fontSize: 16,
    fontWeight: '900',
  },
  profileEmail: {
    color: '#9aa9b8',
    fontSize: 12,
    fontWeight: '800',
  },
  profileBadge: {
    fontSize: 11,
    fontWeight: '900',
  },
  budgetCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0b5931',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  budgetContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 18,
  },
  budgetGauge: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 56,
    borderWidth: 1,
    borderColor: '#bdeecf',
  },
  budgetGaugeValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  budgetGaugeLabel: {
    color: '#52645d',
    fontSize: 10,
    fontWeight: '900',
  },
  budgetRows: {
    flex: 1,
    gap: 8,
  },
  themePanel: {
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccefdc',
    backgroundColor: '#ffffff',
    padding: 14,
    shadowColor: '#0b5931',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#e6ece9',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  tabButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  tabIcon: {
    color: '#9aa9b8',
    fontSize: 17,
    fontWeight: '900',
  },
  tabButtonText: {
    color: '#9aa9b8',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  centerActionButton: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    borderWidth: 5,
    borderColor: '#ffffff',
    marginTop: -30,
    shadowColor: '#0b5931',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  centerActionButtonActive: {
    transform: [{ scale: 1.04 }],
  },
  centerActionText: {
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.7,
  },
});

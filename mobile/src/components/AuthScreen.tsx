import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthMode = 'signIn' | 'signUp';

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignIn = mode === 'signIn';

  async function handleSubmit() {
    if (!supabase) {
      setMessage('Supabase env bilgileri eklenmeden auth calismaz.');
      return;
    }

    const nextEmail = email.trim();

    if (!nextEmail || password.length < 6) {
      setMessage('Email gir ve en az 6 karakterli sifre kullan.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    const { error } = isSignIn
      ? await supabase.auth.signInWithPassword({ email: nextEmail, password })
      : await supabase.auth.signUp({ email: nextEmail, password });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(isSignIn ? 'Giris basarili.' : 'Kayit olustu. Email onayi gerekebilir.');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>FishApp</Text>
        <Text style={styles.title}>{isSignIn ? 'Hesabina giris yap.' : 'Yeni hesap olustur.'}</Text>
        <Text style={styles.subtitle}>
          Fislerini kaydetmek ve harcamalarini takip etmek icin oturum ac.
        </Text>
      </View>

      {!isSupabaseConfigured ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Supabase env bekleniyor</Text>
          <Text style={styles.noticeText}>
            mobile/.env dosyasina EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY
            eklenince auth aktif olur.
          </Text>
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#83918b"
            style={styles.input}
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Sifre"
            placeholderTextColor="#83918b"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <Pressable
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              isSubmitting && styles.disabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>{isSignIn ? 'Giris yap' : 'Kayit ol'}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(isSignIn ? 'signUp' : 'signIn');
              setMessage('');
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {isSignIn ? 'Hesabin yok mu? Kayit ol' : 'Hesabin var mi? Giris yap'}
            </Text>
          </Pressable>

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      )}
    </KeyboardAvoidingView>
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
    marginBottom: 28,
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
  notice: {
    borderWidth: 1,
    borderColor: '#d8e3dd',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 8,
  },
  noticeTitle: {
    color: '#a35f00',
    fontSize: 18,
    fontWeight: '800',
  },
  noticeText: {
    color: '#52645d',
    fontSize: 14,
    lineHeight: 21,
  },
  form: {
    gap: 12,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#d8e3dd',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#12231d',
    fontSize: 16,
    paddingHorizontal: 14,
  },
  primaryButton: {
    minHeight: 52,
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
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#21725e',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.7,
  },
  message: {
    color: '#52645d',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});

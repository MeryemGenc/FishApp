import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthScreen } from './src/components/AuthScreen';
import { CameraScreen } from './src/components/CameraScreen';
import { HomeScreen } from './src/components/HomeScreen';
import { useAuthSession } from './src/hooks/useAuthSession';

export default function App() {
  const { session, isLoading } = useAuthSession();
  const [activeScreen, setActiveScreen] = useState<'home' | 'camera'>('home');
  const [latestPhotoUri, setLatestPhotoUri] = useState<string | null>(null);

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
          onUsePhoto={(photoUri) => {
            setLatestPhotoUri(photoUri);
            setActiveScreen('home');
          }}
        />
      ) : null}

      {session && activeScreen === 'home' ? (
        <HomeScreen
          latestPhotoUri={latestPhotoUri}
          onOpenCamera={() => setActiveScreen('camera')}
          session={session}
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

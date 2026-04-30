import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthScreen } from './src/components/AuthScreen';
import { HomeScreen } from './src/components/HomeScreen';
import { useAuthSession } from './src/hooks/useAuthSession';

export default function App() {
  const { session, isLoading } = useAuthSession();

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
      {session ? <HomeScreen session={session} /> : <AuthScreen />}
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

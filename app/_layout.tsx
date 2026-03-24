import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { View, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { getCalendarPreferences } from '../src/lib/googleCalendar';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = segments[0] === 'login';

    const checkOnboarding = async () => {
      const prefs = await getCalendarPreferences(session!.user.id);
      if (!prefs) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    };

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup) {
      checkOnboarding();
    }
  }, [session, authLoading, segments]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#00FF88" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#121212' } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="meeting/[id]" options={{ presentation: 'modal', headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={Platform.OS === 'web' ? styles.webContainer : styles.mobileContainer}>
          <StatusBar style="light" />
          <RootLayoutNav />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 700,
    marginHorizontal: 'auto',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
});

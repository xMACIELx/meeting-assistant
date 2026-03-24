import React from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { CalendarSelector } from '../src/components/CalendarSelector';

export default function OnboardingScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const handleDone = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: '#00FF88', fontSize: 14, fontFamily: 'Inter_500Medium' }}>
            Bem-vindo ao ReunIA 🎉
          </Text>
        </View>

        <CalendarSelector
          userId={user!.id}
          accessToken={profile?.google_access_token ?? ''}
          showSkip
          onSave={handleDone}
          onSkip={handleDone}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

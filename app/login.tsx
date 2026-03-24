import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      const redirectUrl = 'reunia://auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes:
            'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/contacts.other.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        console.log('Browser result:', result.type, (result as any).url);

        if (result.type === 'success' && (result as any).url) {
          const url = (result as any).url as string;
          console.log('Callback URL:', url);

          const hash = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          console.log('access_token:', !!access_token);

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) console.error('Session error:', sessionError);

            // Salvar tokens do Google no profile
            const provider_token = params.get('provider_token');
            const provider_refresh_token = params.get('provider_refresh_token');

            if (provider_token) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from('profiles')
                  .update({
                    google_access_token: provider_token,
                    google_refresh_token: provider_refresh_token,
                    google_token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
                  })
                  .eq('id', user.id);
                console.log('Google tokens salvos para:', user.email);
              }
            }
          } else {
            await new Promise(r => setTimeout(r, 500));
            const { data } = await supabase.auth.getSession();
            console.log('Fallback session:', data?.session?.user?.email);
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível fazer login. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        {/* Logo */}
        <Text
          style={{
            color: '#00FF88',
            fontSize: 52,
            fontFamily: 'Inter_700Bold',
            marginBottom: 8,
            letterSpacing: -1,
          }}
        >
          ReunIA
        </Text>
        <Text
          style={{
            color: '#6b7280',
            fontSize: 16,
            fontFamily: 'Inter_400Regular',
            textAlign: 'center',
            marginBottom: 72,
            lineHeight: 24,
          }}
        >
          Grave, transcreva e resuma{'\n'}suas reuniões com IA
        </Text>

        {/* Botão Google */}
        <TouchableOpacity
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff',
            borderRadius: 16,
            paddingVertical: 16,
            paddingHorizontal: 24,
            width: '100%',
            justifyContent: 'center',
            gap: 12,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: '#4285F4' }}>
                G
              </Text>
              <Text
                style={{
                  color: '#000',
                  fontSize: 16,
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                Continuar com Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text
          style={{
            color: '#4b5563',
            fontSize: 12,
            fontFamily: 'Inter_400Regular',
            textAlign: 'center',
            marginTop: 24,
            lineHeight: 18,
          }}
        >
          Ao continuar, você concorda com os Termos de Uso{'\n'}e Política de Privacidade do
          ReunIA
        </Text>
      </View>
    </SafeAreaView>
  );
}

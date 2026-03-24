import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Switch, Alert, Modal } from 'react-native';
import { Calendar, Bell, Mic, Shield, ChevronRight, LogOut, Info, X } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { CalendarSelector } from '../../src/components/CalendarSelector';
import { getCalendarPreferences } from '../../src/lib/googleCalendar';
import { supabase } from '../../src/lib/supabase';

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingRow({ icon, label, subtitle, onPress, rightElement, danger }: SettingRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
      }}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: danger ? '#ef444420' : '#1f1f1f',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{
          color: danger ? '#ef4444' : '#fff',
          fontSize: 15,
          fontFamily: 'Inter_500Medium',
        }}>
          {label}
        </Text>
        {subtitle && (
          <Text style={{ color: '#6b7280', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 }}>
            {subtitle}
          </Text>
        )}
      </View>

      {rightElement ?? (
        onPress && <ChevronRight size={16} color="#4b5563" />
      )}
    </TouchableOpacity>
  );
}

function SectionCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{
        color: '#4b5563', fontSize: 11, fontFamily: 'Inter_500Medium',
        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4,
      }}>
        {title}
      </Text>
      <View style={{
        backgroundColor: '#1a1a1a', borderRadius: 16,
        borderWidth: 1, borderColor: '#2a2a2a', overflow: 'hidden',
      }}>
        {children}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#2a2a2a', marginLeft: 66 }} />;
}

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [autoTranscribe, setAutoTranscribe] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: 40, marginBottom: 28 }}>
          <Text style={{ color: '#6b7280', fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 4 }}>
            Preferências
          </Text>
          <Text style={{ color: '#fff', fontSize: 28, fontFamily: 'Inter_700Bold' }}>
            Ajustes
          </Text>
        </View>

        {/* Profile card */}
        <View style={{
          backgroundColor: '#1a1a1a', borderRadius: 20, padding: 20,
          borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 28,
          flexDirection: 'row', alignItems: 'center', gap: 16,
        }}>
          <View style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: '#00FF8820', alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: '#00FF8840',
          }}>
            <Text style={{ fontSize: 22 }}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
              {profile?.full_name ?? user?.user_metadata?.full_name ?? 'Usuário'}
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }} numberOfLines={1}>
              {user?.email ?? 'Conta Google'}
            </Text>
          </View>
          <View style={{
            backgroundColor: '#00FF8820', paddingHorizontal: 12, paddingVertical: 5,
            borderRadius: 20, borderWidth: 1, borderColor: '#00FF8840',
          }}>
            <Text style={{ color: '#00FF88', fontSize: 12, fontFamily: 'Inter_500Medium' }}>
              Free
            </Text>
          </View>
        </View>

        {/* Integrations */}
        <SectionCard title="Integrações">
          <SettingRow
            icon={<Calendar size={18} color="#4285F4" />}
            label="Google Calendar"
            subtitle="Calendários sincronizados"
            onPress={() => setShowCalendarModal(true)}
          />
          <Divider />
          <SettingRow
            icon={<Calendar size={18} color="#0078d4" />}
            label="Microsoft Outlook"
            subtitle="Não conectado"
            onPress={() => { }}
          />
        </SectionCard>

        {/* Notifications */}
        <SectionCard title="Notificações">
          <SettingRow
            icon={<Bell size={18} color="#f59e0b" />}
            label="Lembretes de reunião"
            subtitle="15 minutos antes"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#2a2a2a', true: '#00FF8860' }}
                thumbColor={notifications ? '#00FF88' : '#6b7280'}
              />
            }
          />
        </SectionCard>

        {/* Audio */}
        <SectionCard title="Áudio e Transcrição">
          <SettingRow
            icon={<Mic size={18} color="#00FF88" />}
            label="Transcrição automática"
            subtitle="Transcreve ao terminar gravação"
            rightElement={
              <Switch
                value={autoTranscribe}
                onValueChange={setAutoTranscribe}
                trackColor={{ false: '#2a2a2a', true: '#00FF8860' }}
                thumbColor={autoTranscribe ? '#00FF88' : '#6b7280'}
              />
            }
          />
          <Divider />
          <SettingRow
            icon={<Shield size={18} color="#8b5cf6" />}
            label="Permissão de microfone"
            subtitle="Gerenciar acesso"
            onPress={() => { }}
          />
        </SectionCard>

        {/* About */}
        <SectionCard title="Sobre">
          <SettingRow
            icon={<Info size={18} color="#6b7280" />}
            label="Versão do app"
            subtitle="1.0.0 (MVP)"
          />
        </SectionCard>

        {/* Logout */}
        <SectionCard title="Conta">
          <SettingRow
            icon={<LogOut size={18} color="#ef4444" />}
            label="Sair da conta"
            onPress={handleSignOut}
            danger
          />
        </SectionCard>

      </ScrollView>

      <Modal visible={showCalendarModal} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{
            backgroundColor: '#1a1a1a',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: '85%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' }}>
                Calendários
              </Text>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)} activeOpacity={0.7}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {user && (
              <CalendarSelector
                userId={user.id}
                accessToken={profile?.google_access_token ?? ''}
                onSave={async () => {
                  const newPrefs = await getCalendarPreferences(user.id);
                  const disabledIds = (newPrefs ?? []).filter(c => !c.enabled).map(c => c.id);
                  setShowCalendarModal(false);
                  if (disabledIds.length > 0) {
                    Alert.alert(
                      'Calendários atualizados',
                      'Deseja remover as reuniões dos calendários desmarcados?',
                      [
                        { text: 'Manter tudo', style: 'cancel' },
                        {
                          text: 'Remover',
                          style: 'destructive',
                          onPress: async () => {
                            await supabase
                              .from('meetings')
                              .delete()
                              .eq('user_id', user.id)
                              .in('external_id', disabledIds);
                          },
                        },
                      ]
                    );
                  }
                }}
              />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

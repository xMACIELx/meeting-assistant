import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { MeetingCard } from '../../src/components/MeetingCard';
import { CreateMeetingModal } from '../../src/components/CreateMeetingModal';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatTodayFull() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function DashboardScreen() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadMeetings = async () => {
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .order('date', { ascending: true });
    if (data) setMeetings(data);
    setLoading(false);
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const _d = new Date();
  const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
  const todayMeetings = meetings.filter(m => m.date === todayStr);
  const inProgress = todayMeetings.find(m => m.status === 'Em Andamento');

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#00FF88" />
        </View>
      </SafeAreaView>
    );
  }

  const handleMeetingPress = (id: string) => {
    router.push(`/meeting/${id}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 20 }}>

          {/* Header */}
          <View style={{ paddingTop: 40, marginBottom: 28 }}>
            <Text style={{ color: '#6b7280', fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 4 }}>
              {getGreeting()} 👋
            </Text>
            <Text style={{ color: '#fff', fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 6 }}>
              Agenda de Hoje
            </Text>
            <Text style={{ color: '#4b5563', fontSize: 13, fontFamily: 'Inter_400Regular', textTransform: 'capitalize' }}>
              {formatTodayFull()}
            </Text>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <View style={{
              flex: 1, backgroundColor: '#1a1a1a', borderRadius: 16,
              padding: 16, borderWidth: 1, borderColor: '#2a2a2a'
            }}>
              <Text style={{ color: '#00FF88', fontSize: 24, fontFamily: 'Inter_700Bold' }}>
                {todayMeetings.length}
              </Text>
              <Text style={{ color: '#6b7280', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                Reuniões hoje
              </Text>
            </View>

            <View style={{
              flex: 1, backgroundColor: '#1a1a1a', borderRadius: 16,
              padding: 16, borderWidth: 1, borderColor: '#2a2a2a'
            }}>
              <Text style={{ color: '#3b82f6', fontSize: 24, fontFamily: 'Inter_700Bold' }}>
                {todayMeetings.filter(m => m.status === 'Concluída').length}
              </Text>
              <Text style={{ color: '#6b7280', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                Concluídas
              </Text>
            </View>

            <View style={{
              flex: 1, backgroundColor: '#1a1a1a', borderRadius: 16,
              padding: 16, borderWidth: 1, borderColor: '#2a2a2a'
            }}>
              <Text style={{ color: '#f59e0b', fontSize: 24, fontFamily: 'Inter_700Bold' }}>
                {todayMeetings.filter(m => m.status === 'Agendada').length}
              </Text>
              <Text style={{ color: '#6b7280', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                Pendentes
              </Text>
            </View>
          </View>

          {/* In progress banner */}
          {inProgress && (
            <View style={{
              backgroundColor: '#00FF8815',
              borderRadius: 16,
              padding: 14,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#00FF8830',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FF88' }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#00FF88', fontSize: 11, fontFamily: 'Inter_500Medium' }}>
                  EM ANDAMENTO AGORA
                </Text>
                <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 2 }} numberOfLines={1}>
                  {inProgress.title}
                </Text>
              </View>
            </View>
          )}

          {/* Section title */}
          <Text style={{ color: '#4b5563', fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
            Próximas Reuniões
          </Text>

          <FlatList
            data={todayMeetings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MeetingCard
                meeting={item}
                onPress={() => handleMeetingPress(item.id)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 60 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>📅</Text>
                <Text style={{ color: '#6b7280', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                  Nenhuma reunião para hoje.
                </Text>
              </View>
            }
          />
        </View>

        {/* FAB */}
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          activeOpacity={0.85}
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#00FF88',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#00FF88',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          <Plus size={28} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>

        <CreateMeetingModal
          visible={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={loadMeetings}
        />
      </View>
    </SafeAreaView>
  );
}

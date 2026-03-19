import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { MeetingCard } from '../../src/components/MeetingCard';
import { CreateMeetingModal } from '../../src/components/CreateMeetingModal';

const filters = ['Todas', 'Concluída', 'Em Andamento', 'Agendada'];

const filterActiveColors: Record<string, { bg: string; text: string; border: string }> = {
  'Todas':        { bg: 'rgba(255,255,255,0.08)', text: '#fff',    border: '#9ca3af' },
  'Concluída':    { bg: '#00FF8820',              text: '#00FF88', border: '#00FF88' },
  'Em Andamento': { bg: '#3b82f620',              text: '#3b82f6', border: '#3b82f6' },
  'Agendada':     { bg: '#F59E0B20',              text: '#F59E0B', border: '#F59E0B' },
};

export default function HistoryScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadMeetings = async () => {
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .order('date', { ascending: false });
    if (data) setMeetings(data);
    setLoading(false);
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const filtered = meetings.filter(m => {
    if (activeFilter === 'Todas') return true;
    return m.status === activeFilter;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 20 }}>

          {/* Header */}
          <View style={{ paddingTop: 40, marginBottom: 24 }}>
            <Text style={{ color: '#6b7280', fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 4 }}>
              Suas reuniões
            </Text>
            <Text style={{ color: '#fff', fontSize: 28, fontFamily: 'Inter_700Bold' }}>
              Histórico
            </Text>
          </View>

          {/* Filter chips */}
          <FlatList
            horizontal
            data={filters}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20, flexGrow: 0, marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => {
              const isActive = activeFilter === item;
              const active = filterActiveColors[item];
              return (
                <TouchableOpacity
                  onPress={() => setActiveFilter(item)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 8,
                    backgroundColor: isActive ? active.bg : '#1a1a1a',
                    borderWidth: 1,
                    borderColor: isActive ? active.border : '#2a2a2a',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    color: isActive ? active.text : '#9ca3af',
                    fontSize: 13,
                    fontFamily: 'Inter_500Medium',
                  }}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#00FF88" />
            </View>
          ) : (
            <>
              {/* Count */}
              <Text style={{ color: '#4b5563', fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 16 }}>
                {filtered.length} {filtered.length === 1 ? 'reunião' : 'reuniões'} encontradas
              </Text>

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
                renderItem={({ item }) => (
                  <MeetingCard
                    meeting={item}
                    onPress={() => router.push(`/meeting/${item.id}`)}
                  />
                )}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', marginTop: 60 }}>
                    <Text style={{ fontSize: 40, marginBottom: 12 }}>🗂️</Text>
                    <Text style={{ color: '#6b7280', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                      Nenhuma reunião encontrada.
                    </Text>
                  </View>
                }
              />
            </>
          )}
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

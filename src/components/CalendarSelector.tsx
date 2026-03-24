import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { fetchCalendarList, getCalendarPreferences, saveCalendarPreferences } from '../lib/googleCalendar';

interface CalendarItem {
  id: string;
  name: string;
  enabled: boolean;
  isPrimary: boolean;
  color: string;
}

interface Props {
  userId: string;
  accessToken: string;
  onSave: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export function CalendarSelector({ userId, accessToken, onSave, onSkip, showSkip }: Props) {
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCalendars();
  }, []);

  const loadCalendars = async () => {
    setLoading(true);
    try {
      const list = await fetchCalendarList(accessToken);
      const saved = await getCalendarPreferences(userId);

      const unsorted = saved
        ? list.map(cal => ({
            ...cal,
            enabled: saved.find(s => s.id === cal.id)?.enabled ?? cal.isPrimary,
          }))
        : list.map(cal => ({ ...cal, enabled: cal.isPrimary }));

      const sorted = unsorted.sort((a, b) => {
        if (a.isPrimary) return -1;
        if (b.isPrimary) return 1;
        return a.name.localeCompare(b.name);
      });
      setCalendars(sorted);
    } catch (err) {
      console.error('Erro ao carregar calendários:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCalendar = (id: string) => {
    setCalendars(prev =>
      prev.map(c => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await saveCalendarPreferences(userId, calendars);
    setSaving(false);
    onSave();
  };

  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <ActivityIndicator color="#00FF88" />
      </View>
    );
  }

  return (
    <View>
      <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 8 }}>
        Selecione seus calendários
      </Text>
      <Text style={{ color: '#6b7280', fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 24 }}>
        Escolha quais calendários deseja sincronizar com o ReunIA
      </Text>

      {calendars.map(cal => (
        <TouchableOpacity
          key={cal.id}
          onPress={() => toggleCalendar(cal.id)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#2a2a2a',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: cal.enabled ? '#00FF88' : '#4b5563',
              backgroundColor: cal.enabled ? '#00FF88' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {cal.enabled && (
              <Text style={{ color: '#000', fontSize: 12, fontFamily: 'Inter_700Bold' }}>✓</Text>
            )}
          </View>

          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cal.color }} />

          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter_500Medium' }}>
              {cal.name}
            </Text>
            {cal.isPrimary && (
              <Text style={{ color: '#00FF88', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                Calendário principal
              </Text>
            )}
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
        style={{
          backgroundColor: '#00FF88',
          borderRadius: 16,
          padding: 16,
          alignItems: 'center',
          marginTop: 24,
          opacity: saving ? 0.7 : 1,
        }}
      >
        <Text style={{ color: '#000', fontSize: 15, fontFamily: 'Inter_700Bold' }}>
          {saving ? 'Salvando...' : 'Salvar preferências'}
        </Text>
      </TouchableOpacity>

      {showSkip && onSkip && (
        <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={{ alignItems: 'center', marginTop: 12, paddingVertical: 8 }}>
          <Text style={{ color: '#6b7280', fontSize: 13, fontFamily: 'Inter_400Regular' }}>
            Configurar depois
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

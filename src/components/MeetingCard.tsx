import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Meeting } from '../constants/mockData';
import { StatusTracker } from './StatusTracker';
import { Calendar, Clock } from 'lucide-react-native';

interface MeetingCardProps {
  meeting: Meeting;
  onPress: () => void;
}

const statusColors: Record<string, string> = {
  'Agendada': '#F59E0B',
  'Em Andamento': '#3b82f6',
  'Concluída': '#00FF88',
};

const statusBg: Record<string, string> = {
  'Agendada': '#F59E0B20',
  'Em Andamento': '#3b82f620',
  'Concluída': '#00FF8820',
};

export function MeetingCard({ meeting, onPress }: MeetingCardProps) {
  const accentColor = statusColors[meeting.status] ?? '#6b7280';
  const accentBg = statusBg[meeting.status] ?? '#6b728020';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        overflow: 'hidden',
      }}
    >
      {/* Accent left border */}
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 4, backgroundColor: accentColor }} />

        <View style={{ flex: 1, padding: 18 }}>
          {/* Status badge */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{
              backgroundColor: accentBg,
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 20,
            }}>
              <Text style={{
                color: accentColor,
                fontSize: 11,
                fontFamily: 'Inter_500Medium',
              }}>
                {meeting.status}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text
            style={{
              color: '#ffffff',
              fontSize: 16,
              fontFamily: 'Inter_600SemiBold',
              marginBottom: 12,
              lineHeight: 22,
            }}
          >
            {meeting.title}
          </Text>

          {/* Info row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} color="#6b7280" />
              <Text style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                {new Date(meeting.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color="#6b7280" />
              <Text style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                {meeting.time}
              </Text>
            </View>
          </View>


          {/* Divider */}
          <View style={{ height: 1, backgroundColor: '#2a2a2a', marginBottom: 16 }} />

          <StatusTracker status={meeting.status} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

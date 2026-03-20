import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const STATUS_OPTIONS = ['Agendada', 'Em Andamento', 'Concluída'] as const;

const statusColors: Record<string, string> = {
  'Agendada': '#F59E0B',
  'Em Andamento': '#3b82f6',
  'Concluída': '#00FF88',
};

function maskDate(text: string): string {
  const n = text.replace(/\D/g, '');
  if (n.length > 4) return n.slice(0, 2) + '/' + n.slice(2, 4) + '/' + n.slice(4, 8);
  if (n.length > 2) return n.slice(0, 2) + '/' + n.slice(2);
  return n;
}

function maskTime(text: string): string {
  const n = text.replace(/\D/g, '');
  if (n.length > 2) return n.slice(0, 2) + ':' + n.slice(2, 4);
  return n;
}

function parseDateWeb(text: string): string {
  const [d, m, y] = text.split('/');
  return `${y}-${m}-${d}`;
}

export function CreateMeetingModal({ visible, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  // Mobile
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // Web
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');

  const [participants, setParticipants] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<string>('Agendada');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const inputStyle = (field: string) => ({
    ...input,
    borderColor: errors[field] ? '#ef4444' : '#2a2a2a',
  });

  const clearError = (field: string) =>
    setErrors(prev => ({ ...prev, [field]: '' }));

  const reset = () => {
    setTitle('');
    setParticipants('');
    setSummary('');
    setStatus('Agendada');
    setSelectedDate(new Date());
    setDateText('');
    setTimeText('');
    setErrors({});
  };

  const handleCreate = async () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Título é obrigatório';
    if (Platform.OS === 'web') {
      if (!dateText.trim() || dateText.length < 10) newErrors.date = 'Data é obrigatória';
      if (!timeText.trim() || timeText.length < 5) newErrors.time = 'Hora é obrigatória';
    }
    if (!participants.trim()) newErrors.participants = 'Participantes é obrigatório';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    let dateStr: string;
    let timeStr: string;

    if (Platform.OS === 'web') {
      dateStr = parseDateWeb(dateText);
      timeStr = timeText;
    } else {
      dateStr = selectedDate.toISOString().split('T')[0];
      timeStr = selectedDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('meetings').insert({
        title: title.trim(),
        date: dateStr,
        time: timeStr,
        status,
        participants: participants
          ? participants.split(',').map((p) => p.trim()).filter(Boolean)
          : [],
        summary: summary.trim() || null,
        external_id: null,
      });

      if (error) throw error;

      reset();
      onClose();
      onCreated();
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível criar a reunião.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={{
            backgroundColor: '#1a1a1a',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: '90%',
          }}
        >
          {/* Handle bar */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: '#3a3a3a',
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 20,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' }}>
              Nova Reunião
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ overflow: 'visible' }}>
            {/* Título */}
            <Text style={label}>Título *</Text>
            <TextInput
              style={inputStyle('title')}
              placeholder="Nome da reunião"
              placeholderTextColor="#4b5563"
              value={title}
              onChangeText={(text) => { setTitle(text); if (errors.title) clearError('title'); }}
            />
            {errors.title ? (
              <Text style={errMsg}>{errors.title}</Text>
            ) : null}

            {/* Data e Hora */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={label}>Data *</Text>
                {Platform.OS === 'web' ? (
                  <>
                    <TextInput
                      style={inputStyle('date')}
                      placeholder="dd/mm/aaaa"
                      placeholderTextColor="#4b5563"
                      value={dateText}
                      onChangeText={(text) => { setDateText(maskDate(text)); if (errors.date) clearError('date'); }}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                    {errors.date ? <Text style={errMsg}>{errors.date}</Text> : null}
                  </>
                ) : (
                  <TouchableOpacity style={input} onPress={() => setShowDatePicker(true)}>
                    <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter_400Regular' }}>
                      {selectedDate.toLocaleDateString('pt-BR')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={label}>Hora *</Text>
                {Platform.OS === 'web' ? (
                  <>
                    <TextInput
                      style={inputStyle('time')}
                      placeholder="HH:MM"
                      placeholderTextColor="#4b5563"
                      value={timeText}
                      onChangeText={(text) => { setTimeText(maskTime(text)); if (errors.time) clearError('time'); }}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                    {errors.time ? <Text style={errMsg}>{errors.time}</Text> : null}
                  </>
                ) : (
                  <TouchableOpacity style={input} onPress={() => setShowTimePicker(true)}>
                    <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter_400Regular' }}>
                      {selectedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {showDatePicker && Platform.OS !== 'web' && (
              <Modal transparent animationType="slide">
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <View style={{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={{ color: '#6b7280', fontSize: 15, fontFamily: 'Inter_500Medium' }}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={{ color: '#00FF88', fontSize: 15, fontFamily: 'Inter_700Bold' }}>Confirmar</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      locale="pt-BR"
                      textColor="#fff"
                      style={{ backgroundColor: '#1a1a1a' }}
                      onChange={(_, date) => {
                        if (date) setSelectedDate(prev => {
                          const updated = new Date(date);
                          updated.setHours(prev.getHours(), prev.getMinutes());
                          return updated;
                        });
                      }}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {showTimePicker && Platform.OS !== 'web' && (
              <Modal transparent animationType="slide">
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <View style={{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={{ color: '#6b7280', fontSize: 15, fontFamily: 'Inter_500Medium' }}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={{ color: '#00FF88', fontSize: 15, fontFamily: 'Inter_700Bold' }}>Confirmar</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedDate}
                      mode="time"
                      display="spinner"
                      is24Hour
                      textColor="#fff"
                      style={{ backgroundColor: '#1a1a1a' }}
                      onChange={(_, date) => {
                        if (date) setSelectedDate(prev => {
                          const updated = new Date(prev);
                          updated.setHours(date.getHours(), date.getMinutes());
                          return updated;
                        });
                      }}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {/* Participantes */}
            <Text style={label}>Participantes *</Text>
            <TextInput
              style={inputStyle('participants')}
              placeholder="João, Maria, Pedro"
              placeholderTextColor="#4b5563"
              value={participants}
              onChangeText={(text) => { setParticipants(text); if (errors.participants) clearError('participants'); }}
            />
            {errors.participants ? (
              <Text style={errMsg}>{errors.participants}</Text>
            ) : null}

            {/* Resumo */}
            <Text style={label}>Resumo</Text>
            <TextInput
              style={[input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Descrição ou pauta da reunião"
              placeholderTextColor="#4b5563"
              value={summary}
              onChangeText={setSummary}
              multiline
            />

            {/* Status */}
            <Text style={label}>Status</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
              {STATUS_OPTIONS.map((s) => {
                const isActive = status === s;
                const color = statusColors[s];
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStatus(s)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      alignItems: 'center',
                      backgroundColor: isActive ? color + '20' : '#111',
                      borderColor: isActive ? color : '#2a2a2a',
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? color : '#6b7280',
                        fontSize: 11,
                        fontFamily: 'Inter_500Medium',
                      }}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Botão criar */}
            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              style={{
                backgroundColor: '#00FF88',
                borderRadius: 16,
                padding: 16,
                alignItems: 'center',
                marginBottom: 8,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: '#000', fontSize: 15, fontFamily: 'Inter_700Bold' }}>
                {loading ? 'Criando...' : 'Criar Reunião'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const label = {
  color: '#9ca3af',
  fontSize: 12,
  fontFamily: 'Inter_500Medium',
  marginBottom: 6,
  marginTop: 16,
} as const;

const errMsg = {
  color: '#ef4444',
  fontSize: 11,
  marginTop: 4,
  fontFamily: 'Inter_400Regular',
} as const;

const input = {
  backgroundColor: '#111',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#2a2a2a',
  color: '#fff',
  fontSize: 14,
  fontFamily: 'Inter_400Regular',
  paddingHorizontal: 14,
  paddingVertical: 12,
  marginHorizontal: 2,
} as const;

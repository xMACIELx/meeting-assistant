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

export function CreateMeetingModal({ visible, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [participants, setParticipants] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<string>('Agendada');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setTitle('');
    setDate('');
    setTime('');
    setParticipants('');
    setSummary('');
    setStatus('Agendada');
  };

  const handleCreate = async () => {
    if (!title.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha título, data e hora.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('meetings').insert({
        title: title.trim(),
        date: date.trim(),
        time: time.trim(),
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
            <Text
              style={{
                color: '#fff',
                fontSize: 18,
                fontFamily: 'Inter_700Bold',
              }}
            >
              Nova Reunião
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Título */}
            <Text style={label}>Título *</Text>
            <TextInput
              style={input}
              placeholder="Nome da reunião"
              placeholderTextColor="#4b5563"
              value={title}
              onChangeText={setTitle}
            />

            {/* Data e Hora */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={label}>Data *</Text>
                <TextInput
                  style={input}
                  placeholder="2026-03-18"
                  placeholderTextColor="#4b5563"
                  value={date}
                  onChangeText={setDate}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={label}>Hora *</Text>
                <TextInput
                  style={input}
                  placeholder="14:00"
                  placeholderTextColor="#4b5563"
                  value={time}
                  onChangeText={setTime}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            {/* Participantes */}
            <Text style={label}>Participantes</Text>
            <TextInput
              style={input}
              placeholder="João, Maria, Pedro"
              placeholderTextColor="#4b5563"
              value={participants}
              onChangeText={setParticipants}
            />

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
              <Text
                style={{
                  color: '#000',
                  fontSize: 15,
                  fontFamily: 'Inter_700Bold',
                }}
              >
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
} as const;

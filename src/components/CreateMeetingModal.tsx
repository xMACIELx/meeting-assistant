import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface Contact {
  name?: string;
  email: string;
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
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  // Mobile
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // Web
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');

  // Participantes
  const [participantQuery, setParticipantQuery] = useState('');
  const [contactSuggestions, setContactSuggestions] = useState<Contact[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<Contact[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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
    setSummary('');
    setStatus('Agendada');
    setSelectedDate(new Date());
    setDateText('');
    setTimeText('');
    setSelectedParticipants([]);
    setParticipantQuery('');
    setContactSuggestions([]);
    setErrors({});
  };

  const searchContacts = async (query: string) => {
    try {
      setLoadingSuggestions(true);

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('google_access_token')
        .eq('id', currentUser!.id)
        .single();

      if (!profile?.google_access_token) return;

      const urls = [
        `https://people.googleapis.com/v1/otherContacts:search?query=${encodeURIComponent(query)}&readMask=names,emailAddresses&pageSize=5`,
        `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses&pageSize=5`,
      ];

      for (const url of urls) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${profile.google_access_token}` },
        });
        const data = await res.json();

        const results: Contact[] = (data.results ?? [])
          .map((r: any) => ({
            name: r.person?.names?.[0]?.displayName,
            email: r.person?.emailAddresses?.[0]?.value,
          }))
          .filter((c: Contact) => c.email);

        if (results.length > 0) {
          setContactSuggestions(results);
          return;
        }
      }

      setContactSuggestions([]);
    } catch (err) {
      console.error('Erro ao buscar contatos:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (participantQuery.length >= 3) {
      const timer = setTimeout(() => searchContacts(participantQuery), 300);
      return () => clearTimeout(timer);
    } else {
      setContactSuggestions([]);
    }
  }, [participantQuery]);

  const handleCreate = async () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Título é obrigatório';
    if (Platform.OS === 'web') {
      if (!dateText.trim() || dateText.length < 10) newErrors.date = 'Data é obrigatória';
      if (!timeText.trim() || timeText.length < 5) newErrors.time = 'Hora é obrigatória';
    }

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
      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          user_id: user?.id,
          title: title.trim(),
          date: dateStr,
          time: timeStr,
          status,
          summary: summary.trim() || null,
          external_id: null,
        })
        .select()
        .single();

      if (error) throw error;

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const allParticipants = [
        {
          meeting_id: meeting.id,
          name: currentUser?.user_metadata?.full_name ?? currentUser?.email,
          email: currentUser?.email,
          is_app_user: true,
          app_user_id: currentUser?.id,
        },
        ...selectedParticipants.map(p => ({
          meeting_id: meeting.id,
          name: p.name ?? p.email,
          email: p.email,
          is_app_user: false,
        })),
      ];

      await supabase.from('meeting_participants').insert(allParticipants);

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
            <Text style={label}>Participantes</Text>

            {/* Chips dos participantes selecionados */}
            {selectedParticipants.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {selectedParticipants.map((p, index) => (
                  <View key={index} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#00FF8820',
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: '#00FF8840',
                    gap: 6,
                  }}>
                    <Text style={{ color: '#00FF88', fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                      {p.name ?? p.email}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      setSelectedParticipants(prev => prev.filter((_, i) => i !== index));
                    }}>
                      <X size={14} color="#00FF88" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Input de busca */}
            <TextInput
              style={input}
              placeholder="Buscar por nome ou email..."
              placeholderTextColor="#4b5563"
              value={participantQuery}
              onChangeText={setParticipantQuery}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Dropdown de sugestões */}
            {contactSuggestions.length > 0 && (
              <View style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#2a2a2a',
                marginTop: 4,
                overflow: 'hidden',
              }}>
                {contactSuggestions.map((contact, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      if (!selectedParticipants.find(p => p.email === contact.email)) {
                        setSelectedParticipants(prev => [...prev, contact]);
                      }
                      setParticipantQuery('');
                      setContactSuggestions([]);
                    }}
                    style={{
                      padding: 12,
                      borderBottomWidth: index < contactSuggestions.length - 1 ? 1 : 0,
                      borderBottomColor: '#2a2a2a',
                    }}
                  >
                    {contact.name && (
                      <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter_500Medium' }}>
                        {contact.name}
                      </Text>
                    )}
                    <Text style={{ color: '#6b7280', fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                      {contact.email}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Opção de adicionar email digitado diretamente */}
                {participantQuery.includes('@') && !contactSuggestions.find(c => c.email === participantQuery) && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedParticipants(prev => [...prev, { email: participantQuery }]);
                      setParticipantQuery('');
                      setContactSuggestions([]);
                    }}
                    style={{ padding: 12, borderTopWidth: 1, borderTopColor: '#2a2a2a' }}
                  >
                    <Text style={{ color: '#00FF88', fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                      + Adicionar "{participantQuery}"
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Opção de adicionar email quando não há sugestões */}
            {contactSuggestions.length === 0 && participantQuery.includes('@') && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedParticipants(prev => [...prev, { email: participantQuery }]);
                  setParticipantQuery('');
                }}
                style={{
                  padding: 12,
                  marginTop: 4,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#2a2a2a',
                  backgroundColor: '#111',
                }}
              >
                <Text style={{ color: '#00FF88', fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                  + Adicionar "{participantQuery}"
                </Text>
              </TouchableOpacity>
            )}

            {loadingSuggestions && (
              <ActivityIndicator size="small" color="#00FF88" style={{ marginTop: 8 }} />
            )}

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

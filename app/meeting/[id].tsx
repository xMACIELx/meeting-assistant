import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import {
  ArrowLeft,
  Mic,
  Pause,
  Square,
  Play,
  Calendar,
  Clock,
  Users,
  FileAudio,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react-native';
import { StatusTracker } from '../../src/components/StatusTracker';
import { supabase } from '../../src/lib/supabase';
import { File as ExpoFile } from 'expo-file-system';

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordingState = 'idle' | 'recording' | 'paused';

interface MeetingRow {
  id: string;
  external_id: string | null;
  title: string;
  date: string;
  time: string;
  status: 'Agendada' | 'Em Andamento' | 'Concluída';
  participants: string[];
  summary: string | null;
  created_at: string;
  updated_at: string;
}

interface RecordingRow {
  id: string;
  meeting_id: string;
  audio_url: string;
  duration: number | null;
  file_path: string;
  created_at: string;
}

interface TranscriptionRow {
  id: string;
  meeting_id: string;
  transcription_text: string;
  summary: string;
  is_current: boolean;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatDatePtBR(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

const transcribeAudioWithGroq = async (audioUrl: string): Promise<string> => {
  const audioResponse = await fetch(audioUrl);
  const audioBlob = await audioResponse.blob();

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.m4a');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'pt');
  formData.append('response_format', 'text');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error('Groq Whisper error: ' + JSON.stringify(err));
  }

  return await res.text();
};

const generateSummaryWithGroq = async (transcription: string): Promise<string> => {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente especializado em reuniões corporativas brasileiras. Gere resumos executivos concisos e objetivos em português.',
        },
        {
          role: 'user',
          content: `Com base nesta transcrição de reunião, gere um RESUMO EXECUTIVO em 3-5 frases destacando: principais tópicos discutidos, decisões tomadas e próximos passos.\n\nTranscrição:\n${transcription}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error('Groq Llama error: ' + JSON.stringify(err));
  }

  const data = await res.json();
  return data.choices[0].message.content;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MeetingDetails() {
  const { id: meetingId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Meeting
  const [meeting, setMeeting] = useState<MeetingRow | null>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);

  // Recording
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [activeRecording, setActiveRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Data
  const [recordings, setRecordings] = useState<RecordingRow[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState<TranscriptionRow | null>(null);
  const [allTranscriptions, setAllTranscriptions] = useState<TranscriptionRow[]>([]);

  // UI flags
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);

  // Audio player modal
  const [playerRecording, setPlayerRecording] = useState<RecordingRow | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  // History modal
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoadingMeeting(true);
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();
    setMeeting(data ?? null);
    setLoadingMeeting(false);
    if (data) {
      loadRecordings(data.id);
      loadCurrentTranscription(data.id);
      loadAllTranscriptions(data.id);
    }
  };

  const loadAllTranscriptions = async (id: string) => {
    const { data } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('meeting_id', id)
      .order('created_at', { ascending: false });
    if (data) setAllTranscriptions(data);
  };

  const loadRecordings = async (id: string) => {
    const { data } = await supabase
      .from('recordings')
      .select('*')
      .eq('meeting_id', id)
      .order('created_at', { ascending: false });
    if (data) setRecordings(data);
  };

  const loadCurrentTranscription = async (id: string) => {
    const { data } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('meeting_id', id)
      .eq('is_current', true)
      .single();
    if (data) setCurrentTranscription(data);
  };

  // ── Recording ─────────────────────────────────────────────────────────────

  const handleStartRecording = async () => {
    const perm = await Audio.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permissão negada', 'Autorize o acesso ao microfone nas configurações.');
      return;
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setActiveRecording(recording);
    setRecordingState('recording');
    setRecordingDuration(0);
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const handlePauseRecording = async () => {
    if (!activeRecording) return;
    await activeRecording.pauseAsync();
    setRecordingState('paused');
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleResumeRecording = async () => {
    if (!activeRecording) return;
    await activeRecording.startAsync();
    setRecordingState('recording');
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const handleStopRecording = async () => {
    if (!activeRecording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    await activeRecording.stopAndUnloadAsync();
    const uri = activeRecording.getURI();
    setActiveRecording(null);
    setRecordingState('idle');
    if (uri && meeting) {
      await saveRecordingToSupabase(uri, recordingDuration);
    }
  };

  // ── Save recording ────────────────────────────────────────────────────────

  const saveRecordingToSupabase = async (uri: string, durationSeconds: number) => {
    if (!meeting) return;
    setIsUploading(true);
    try {
      const filePath = `${meeting.id}/${Date.now()}.m4a`;
      const audioFile = new ExpoFile(uri);
      const audioBuffer = await audioFile.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(filePath, audioBuffer, { contentType: 'audio/m4a' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('recordings').getPublicUrl(filePath);

      const { data: rec } = await supabase
        .from('recordings')
        .insert({
          meeting_id: meeting.id,
          audio_url: publicUrl,
          file_path: filePath,
          duration: durationSeconds,
        })
        .select()
        .single();

      if (rec) setRecordings((prev) => [rec, ...prev]);

      Alert.alert(
        'Gravação salva',
        currentTranscription
          ? 'Já existe uma transcrição ativa. Deseja reprocessar com todas as gravações?'
          : 'Deseja transcrever agora?',
        [
          { text: 'Agora não', style: 'cancel' },
          {
            text: currentTranscription ? 'Reprocessar' : 'Transcrever',
            onPress: () => transcribeAll(),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar a gravação.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Transcribe ────────────────────────────────────────────────────────────

  const transcribeAll = async () => {
    if (!meeting) return;
    setIsTranscribing(true);
    try {
      const { data: recs } = await supabase
        .from('recordings')
        .select('audio_url')
        .eq('meeting_id', meeting.id)
        .order('created_at', { ascending: true });

      if (!recs || recs.length === 0) return;

      const parts: string[] = [];
      for (const rec of recs) {
        const text = await transcribeAudioWithGroq(rec.audio_url);
        parts.push(text);
      }

      const fullTranscription = parts.join('\n\n');
      const summary = await generateSummaryWithGroq(fullTranscription);

      await supabase
        .from('transcriptions')
        .update({ is_current: false })
        .eq('meeting_id', meeting.id);

      const { data: tx } = await supabase
        .from('transcriptions')
        .insert({
          meeting_id: meeting.id,
          transcription_text: fullTranscription,
          summary,
          is_current: true,
        })
        .select()
        .single();

      if (tx) setCurrentTranscription(tx);

      const { data: history } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('meeting_id', meeting.id)
        .order('created_at', { ascending: false });
      if (history) setAllTranscriptions(history);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível gerar a transcrição.');
      console.error(err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // ── Audio player ──────────────────────────────────────────────────────────

  const openPlayerModal = async (rec: RecordingRow) => {
    try {
      setPlayerRecording(rec);
      setPositionMs(0);
      setDurationMs(0);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound: s } = await Audio.Sound.createAsync(
        { uri: rec.audio_url },
        { shouldPlay: false, progressUpdateIntervalMillis: 100 },
        (status) => {
          if (status.isLoaded) {
            setPositionMs(status.positionMillis ?? 0);
            if (status.durationMillis) setDurationMs(status.durationMillis);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPositionMs(0);
            }
          }
        }
      );
      setSound(s);
    } catch (err) {
      console.error('Erro ao abrir player:', err);
      Alert.alert('Erro', 'Não foi possível carregar o áudio.');
      setPlayerRecording(null);
    }
  };

  const closePlayerModal = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    setPlayerRecording(null);
    setIsPlaying(false);
    setPositionMs(0);
    setDurationMs(0);
  };

  const togglePlay = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  // ── History modal ─────────────────────────────────────────────────────────

  const openHistoryModal = async () => {
    if (!meeting) return;
    const { data } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('meeting_id', meeting.id)
      .order('created_at', { ascending: false });
    if (data) setAllTranscriptions(data);
    setShowHistory(true);
  };

  // ── Early returns ─────────────────────────────────────────────────────────

  if (loadingMeeting) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#00FF88" />
      </View>
    );
  }

  if (!meeting) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-lg font-interSemibold mb-2">Reunião não encontrada</Text>
        <Text className="text-neutral-400 font-inter text-center mb-6">
          Não foi possível carregar os dados desta reunião.
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-[#00FF88] font-interMedium">Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const historyCount = allTranscriptions.length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-12 pb-4 border-b border-neutral-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-interSemibold">Detalhes da Reunião</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6">
        {/* 1. Meeting info */}
        <Text className="text-white text-2xl font-interBold mb-4">{meeting.title}</Text>

        <View className="bg-neutral-900 rounded-2xl p-4 mb-6 border border-neutral-800">
          <View className="flex-row items-center mb-3">
            <Calendar size={18} color="#9ca3af" />
            <Text className="text-neutral-300 font-inter ml-3">
              {new Date(meeting.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
            </Text>
          </View>
          <View className="flex-row items-center mb-3">
            <Clock size={18} color="#9ca3af" />
            <Text className="text-neutral-300 font-inter ml-3">{meeting.time}</Text>
          </View>
          <View className="flex-row items-start">
            <Users size={18} color="#9ca3af" style={{ marginTop: 2 }} />
            <Text className="text-neutral-300 font-inter flex-1 leading-5 ml-3">
              {meeting.participants.join(', ')}
            </Text>
          </View>
        </View>

        {/* 2. Status tracker */}
        <View className="mb-6">
          <StatusTracker status={meeting.status} />
        </View>

        {/* 3. Transcription card */}
        {currentTranscription && (
          <View className="bg-neutral-900 rounded-2xl p-5 mb-6 border border-neutral-800">
            <Text className="text-white font-interSemibold mb-3">Resumo Executivo</Text>
            <Text className="text-neutral-400 font-inter leading-6">
              {currentTranscription.summary}
            </Text>

            <TouchableOpacity
              onPress={() => setTranscriptExpanded(!transcriptExpanded)}
              className="flex-row items-center mt-4"
              activeOpacity={0.7}
            >
              <Text className="text-[#00FF88] font-interMedium mr-1">
                {transcriptExpanded ? 'Ocultar transcrição' : 'Ver transcrição completa'}
              </Text>
              {transcriptExpanded ? (
                <ChevronUp size={16} color="#00FF88" />
              ) : (
                <ChevronDown size={16} color="#00FF88" />
              )}
            </TouchableOpacity>

            {transcriptExpanded && (
              <Text className="text-neutral-400 font-inter leading-6 mt-3">
                {currentTranscription.transcription_text}
              </Text>
            )}

            {historyCount > 1 && (
              <TouchableOpacity onPress={openHistoryModal} className="mt-4" activeOpacity={0.7}>
                <Text className="text-neutral-500 font-inter text-sm">
                  Ver versões anteriores ({historyCount - 1})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 4. Recording controls */}
        <View className="items-center mb-6">
          {(isUploading || isTranscribing) && (
            <View className="flex-row items-center mb-3">
              <ActivityIndicator size="small" color="#00FF88" />
              <Text className="text-neutral-400 font-inter ml-2 text-sm">
                {isUploading ? 'Salvando gravação...' : 'Gerando transcrição...'}
              </Text>
            </View>
          )}

          {recordingState === 'idle' && (
            <TouchableOpacity
              onPress={handleStartRecording}
              activeOpacity={0.8}
              className="w-24 h-24 rounded-full items-center justify-center bg-[#00FF88]/20 border-2 border-[#00FF88]"
            >
              <Mic size={32} color="#00FF88" />
            </TouchableOpacity>
          )}

          {recordingState !== 'idle' && (
            <View className="flex-row items-center gap-4">
              {recordingState === 'recording' ? (
                <TouchableOpacity
                  onPress={handlePauseRecording}
                  activeOpacity={0.8}
                  className="w-20 h-20 rounded-full items-center justify-center bg-yellow-500/20 border-2 border-yellow-500"
                >
                  <Pause size={28} color="#eab308" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleResumeRecording}
                  activeOpacity={0.8}
                  className="w-20 h-20 rounded-full items-center justify-center bg-[#00FF88]/20 border-2 border-[#00FF88]"
                >
                  <Play size={28} color="#00FF88" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleStopRecording}
                activeOpacity={0.8}
                className="w-20 h-20 rounded-full items-center justify-center bg-red-500/20 border-2 border-red-500"
              >
                <Square size={28} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}

          <Text className="text-neutral-400 font-inter text-sm mt-3">
            {recordingState === 'idle' && 'Gravar reunião'}
            {recordingState !== 'idle' && (
              `${recordingState === 'paused' ? '⏸ ' : '⏺ '}${Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:${(recordingDuration % 60).toString().padStart(2, '0')}`
            )}
          </Text>
        </View>

        {/* 5. Transcribe button */}
        {recordings.length > 0 && (
          <TouchableOpacity
            onPress={() => transcribeAll()}
            disabled={isTranscribing || isUploading}
            activeOpacity={0.8}
            className="bg-[#00FF88]/10 border border-[#00FF88] rounded-2xl py-4 items-center mb-6"
          >
            {isTranscribing ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#00FF88" />
                <Text className="text-[#00FF88] font-interSemibold ml-2">Transcrevendo...</Text>
              </View>
            ) : (
              <Text className="text-[#00FF88] font-interSemibold">
                {currentTranscription ? 'Reprocessar transcrição' : 'Transcrever'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* 6. Recordings list */}
        {recordings.length > 0 && (
          <View className="mb-8">
            <Text className="text-white font-interSemibold mb-3">Gravações</Text>
            {recordings.map((rec) => (
              <TouchableOpacity
                key={rec.id}
                onPress={() => openPlayerModal(rec)}
                activeOpacity={0.8}
                className="bg-neutral-900 rounded-xl p-4 mb-3 border border-neutral-800 flex-row items-center"
              >
                <View className="w-10 h-10 rounded-full bg-neutral-800 items-center justify-center mr-3">
                  <FileAudio size={20} color="#9ca3af" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-interMedium text-sm">
                    {formatDatePtBR(rec.created_at)}
                  </Text>
                  {rec.duration != null && (
                    <Text className="text-neutral-500 font-inter text-xs mt-0.5">
                      {formatMs(rec.duration * 1000)}
                    </Text>
                  )}
                </View>
                <Play size={16} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Audio Player Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={playerRecording !== null}
        animationType="slide"
        transparent
        onRequestClose={closePlayerModal}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-neutral-900 rounded-t-3xl p-6">
            {/* Close */}
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-white font-interSemibold text-base">
                {playerRecording ? formatDatePtBR(playerRecording.created_at) : ''}
              </Text>
              <TouchableOpacity onPress={closePlayerModal}>
                <X size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Progress bar */}
            <View className="h-1 bg-neutral-700 rounded-full mb-2">
              <View
                className="h-1 bg-[#00FF88] rounded-full"
                style={{ width: durationMs > 0 ? `${(positionMs / durationMs) * 100}%` : '0%' }}
              />
            </View>
            <View className="flex-row justify-between mb-5">
              <Text className="text-neutral-500 font-inter text-xs">{formatMs(positionMs)}</Text>
              <Text className="text-neutral-500 font-inter text-xs">{formatMs(durationMs)}</Text>
            </View>

            {/* Play/Pause */}
            <View className="items-center mb-6">
              <TouchableOpacity
                onPress={togglePlay}
                activeOpacity={0.8}
                className="w-16 h-16 rounded-full items-center justify-center bg-[#00FF88]/20 border-2 border-[#00FF88]"
              >
                {isPlaying ? (
                  <Pause size={24} color="#00FF88" />
                ) : (
                  <Play size={24} color="#00FF88" />
                )}
              </TouchableOpacity>
            </View>

            {/* Transcription for this meeting */}
            {currentTranscription && (
              <View className="border-t border-neutral-800 pt-4">
                <Text className="text-white font-interSemibold mb-2">Resumo</Text>
                <Text className="text-neutral-400 font-inter text-sm leading-5">
                  {currentTranscription.summary}
                </Text>
                {currentTranscription.transcription_text.length > 0 && (
                  <>
                    <Text className="text-white font-interSemibold mt-4 mb-2">Transcrição</Text>
                    <ScrollView className="max-h-40">
                      <Text className="text-neutral-400 font-inter text-sm leading-5">
                        {currentTranscription.transcription_text}
                      </Text>
                    </ScrollView>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── History Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={showHistory}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHistory(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-neutral-900 rounded-t-3xl p-6" style={{ maxHeight: '80%' }}>
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-white font-interSemibold text-base">
                Histórico de transcrições
              </Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <X size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {allTranscriptions.map((tx) => {
                const isExpanded = expandedHistoryId === tx.id;
                return (
                  <View key={tx.id} className="border-b border-neutral-800 pb-4 mb-4">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-neutral-400 font-inter text-xs">
                        {formatDatePtBR(tx.created_at)}
                      </Text>
                      {tx.is_current && (
                        <View className="ml-2 bg-[#00FF88]/20 rounded px-2 py-0.5">
                          <Text className="text-[#00FF88] text-xs font-interMedium">atual</Text>
                        </View>
                      )}
                    </View>

                    <Text
                      className="text-neutral-300 font-inter text-sm leading-5"
                      numberOfLines={isExpanded ? undefined : 2}
                    >
                      {tx.transcription_text}
                    </Text>

                    {isExpanded && (
                      <View className="mt-3">
                        <View className="h-px bg-neutral-700 mb-3" />
                        <Text className="text-neutral-500 font-interMedium text-xs uppercase mb-1">
                          Resumo
                        </Text>
                        <Text className="text-neutral-300 font-inter text-sm leading-5 mb-3">
                          {tx.summary}
                        </Text>
                        <Text className="text-neutral-500 font-interMedium text-xs uppercase mb-1">
                          Transcrição completa
                        </Text>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                          <Text className="text-neutral-300 font-inter text-sm leading-5">
                            {tx.transcription_text}
                          </Text>
                        </ScrollView>
                      </View>
                    )}

                    <TouchableOpacity
                      className="mt-2 self-start"
                      onPress={() => setExpandedHistoryId(isExpanded ? null : tx.id)}
                    >
                      <Text className="text-[#00FF88] font-interMedium text-xs">
                        {isExpanded ? 'Recolher' : 'Ver completo'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

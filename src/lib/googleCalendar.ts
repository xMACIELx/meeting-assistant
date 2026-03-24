import { supabase } from './supabase';

// Renova o access token usando o refresh token
const refreshGoogleToken = async (userId: string): Promise<string | null> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_refresh_token')
    .eq('id', userId)
    .single();

  if (!profile?.google_refresh_token) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET!,
      refresh_token: profile.google_refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const data = await res.json();
  console.log('Token refresh status:', res.status);

  if (data.access_token) {
    await supabase
      .from('profiles')
      .update({
        google_access_token: data.access_token,
        google_token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      })
      .eq('id', userId);

    return data.access_token;
  }

  return null;
};

// Busca lista completa de calendários com metadados
export const fetchCalendarList = async (accessToken: string): Promise<Array<{
  id: string;
  name: string;
  isPrimary: boolean;
  color: string;
}>> => {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  return (data.items ?? []).map((c: any) => ({
    id: c.id,
    name: c.summary ?? c.id,
    isPrimary: c.primary === true,
    color: c.backgroundColor ?? '#00FF88',
  }));
};

// Salva preferências de calendários no banco
export const saveCalendarPreferences = async (
  userId: string,
  calendars: Array<{ id: string; name: string; enabled: boolean; isPrimary: boolean }>
): Promise<void> => {
  await supabase
    .from('user_preferences')
    .upsert(
      { user_id: userId, key: 'selected_calendars', value: calendars },
      { onConflict: 'user_id,key' }
    );
};

// Busca preferências salvas de calendários
export const getCalendarPreferences = async (
  userId: string
): Promise<Array<{ id: string; name: string; enabled: boolean; isPrimary: boolean }> | null> => {
  const { data } = await supabase
    .from('user_preferences')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'selected_calendars')
    .single();
  return data?.value ?? null;
};

// Busca todos os calendários do usuário
export const fetchAllCalendars = async (accessToken: string): Promise<string[]> => {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  console.log('CalendarList status:', res.status);
  console.log('CalendarList response:', JSON.stringify(data).slice(0, 200));
  return (data.items ?? []).map((c: any) => c.id);
};

// Busca eventos de um calendário no mês atual
export const fetchCalendarEvents = async (
  accessToken: string,
  calendarId: string
): Promise<any[]> => {
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  return data.items ?? [];
};

// Sincroniza eventos do Google Calendar com o banco Supabase
export const syncGoogleCalendar = async (userId: string): Promise<void> => {
  try {
    // Verificar se há sessão ativa
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('Sync: sem sessão ativa, abortando');
      return;
    }

    // Buscar token do profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_access_token, google_token_expiry')
      .eq('id', userId)
      .single();

    if (!profile?.google_access_token) {
      console.log('Sync: sem google_access_token');
      return;
    }

    // Verificar se token expirou ou vai expirar em 5 minutos
    let token = profile.google_access_token;
    const expiry = profile.google_token_expiry ? new Date(profile.google_token_expiry) : null;
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (!expiry || expiry < fiveMinutesFromNow) {
      console.log('Sync: token expirado, renovando...');
      const newToken = await refreshGoogleToken(userId);
      if (!newToken) {
        console.log('Sync: falha ao renovar token');
        return;
      }
      token = newToken;
    }

    // Determinar quais calendários sincronizar
    const prefs = await getCalendarPreferences(userId);
    let calendarIds: string[];

    if (prefs) {
      calendarIds = prefs.filter(c => c.enabled).map(c => c.id);
    } else {
      const allCalendars = await fetchCalendarList(token);
      calendarIds = allCalendars.filter(c => c.isPrimary).map(c => c.id);
    }
    console.log(`Sync: ${calendarIds.length} calendários para sincronizar`);

    for (const calendarId of calendarIds) {
      const events = await fetchCalendarEvents(token, calendarId);
      console.log(`Sync: ${events.length} eventos em ${calendarId}`);

      for (const event of events) {
        if (!event.start?.dateTime && !event.start?.date) continue;
        if (!event.summary) continue;

        // Formatar data e hora
        const startRaw = event.start.dateTime ?? event.start.date;
        const startDate = new Date(startRaw);
        const dateStr = startDate.toISOString().split('T')[0];
        const timeStr = event.start.dateTime
          ? startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
          : '00:00';

        const meetingData = {
          user_id: userId,
          title: event.summary,
          date: dateStr,
          time: timeStr,
          status: 'Agendada' as const,
          summary: event.description ?? null,
          google_event_id: event.id,
          external_id: event.id,
        };

        // Upsert: atualizar se existir, criar se não existir
        const { data: upserted, error: upsertError } = await supabase
          .from('meetings')
          .upsert(meetingData, { onConflict: 'google_event_id' })
          .select()
          .single();

        if (upsertError) {
          console.error('Sync upsert error:', upsertError);
          continue;
        }

        // Importar participantes (attendees)
        if (upserted && event.attendees?.length > 0) {
          // Remover participantes antigos desse meeting
          await supabase
            .from('meeting_participants')
            .delete()
            .eq('meeting_id', upserted.id);

          // Inserir participantes atualizados
          const participants = event.attendees
            .filter((a: any) => a.email)
            .map((a: any) => ({
              meeting_id: upserted.id,
              name: a.displayName ?? a.email,
              email: a.email,
              is_app_user: a.email === (supabase.auth as any)._currentUser?.email ? true : false,
            }));

          if (participants.length > 0) {
            await supabase.from('meeting_participants').insert(participants);
          }
        }
      }
    }

    console.log('Sync: concluído com sucesso');
  } catch (err) {
    console.error('Sync error:', err);
  }
};

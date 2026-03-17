export interface Participant {
  name: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  status: 'Agendada' | 'Em Andamento' | 'Concluída';
  participants: string[];
  summary: string;
}

export const mockMeetings: Meeting[] = [
  {
    id: '1',
    title: 'Fechamento Mensal - Empresa ABC',
    date: '2026-03-14',
    time: '14:30',
    status: 'Em Andamento',
    participants: ['Pedro (Contador)', 'Diego (Cliente)'],
    summary: 'Discussão sobre impostos retidos e conciliação bancária do mês anterior.',
  },
  {
    id: '2',
    title: 'Consultoria Tributária NewTech',
    date: '2026-03-15',
    time: '09:00',
    status: 'Agendada',
    participants: ['Raquiel', 'Time Financeiro'],
    summary: '',
  },
  {
    id: '3',
    title: 'Alinhamento de Folha de Pagamento',
    date: '2026-03-14',
    time: '11:00',
    status: 'Concluída',
    participants: ['Camila (RH)', 'João (Diretor)'],
    summary: 'Ajustes no cálculo de horas extras e definição da data de pagamento do adiantamento mensal. Tudo aprovado para fechamento amanhã.',
  },
  {
    id: '4',
    title: 'Apresentação de Resultados Q1',
    date: '2026-03-20',
    time: '16:00',
    status: 'Agendada',
    participants: ['Diretoria Copiosa', 'Conselho'],
    summary: '',
  }
];

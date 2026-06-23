import test from 'node:test';
import assert from 'node:assert/strict';
import { CERTIFICATION_STATUS } from '../src/config.js';
import {
  buildPriorityReportCsv,
  buildPriorityReportData,
  getPriorityStudents
} from '../src/reports.js';

const students = [
  {
    nome: 'Ana Silva',
    turma: 'Turma A',
    educador: 'Educadora 1',
    situacao: CERTIFICATION_STATUS.naoApto,
    observacao: 'Não apto: não consegue mais atingir 7 períodos válidos.',
    periodosValidos: 0,
    faltas: 6
  },
  {
    nome: 'Bruno Costa',
    turma: 'Turma A',
    educador: 'Educadora 1',
    situacao: CERTIFICATION_STATUS.acompanhamento,
    observacao: 'Risco alto: precisa validar todos os períodos restantes.',
    periodosValidos: 2,
    faltas: 4
  },
  {
    nome: 'Carla Lima',
    turma: 'Turma A',
    educador: 'Educadora 1',
    situacao: CERTIFICATION_STATUS.apto,
    observacao: 'Apto: já cumpriu o mínimo presencial.',
    periodosValidos: 7,
    faltas: 1
  },
  {
    nome: 'Diego Souza',
    turma: 'Turma B',
    educador: 'Educador 2',
    situacao: CERTIFICATION_STATUS.acompanhamento,
    observacao: 'Atenção: ainda depende de novos registros para atingir o mínimo.',
    periodosValidos: 4,
    faltas: 2
  },
  {
    nome: 'Eva Rocha',
    turma: 'Turma B',
    educador: 'Educador 2',
    situacao: CERTIFICATION_STATUS.naoApto,
    observacao: 'Não apto: não consegue mais atingir 7 períodos válidos.',
    periodosValidos: 1,
    faltas: 5
  }
];

test('getPriorityStudents returns non apt and high-risk students in operational priority order', () => {
  const priority = getPriorityStudents(students);

  assert.deepEqual(priority.map((student) => student.nome), [
    'Ana Silva',
    'Eva Rocha',
    'Bruno Costa'
  ]);
});

test('buildPriorityReportData creates priority table and summary by turma', () => {
  const data = buildPriorityReportData({ students }, {
    educador: 'Todos',
    turma: 'Todos',
    municipio: 'Todos'
  });

  assert.deepEqual(data.priorityRows, [
    { nome: 'Ana Silva', turma: 'Turma A', educador: 'Educadora 1' },
    { nome: 'Eva Rocha', turma: 'Turma B', educador: 'Educador 2' },
    { nome: 'Bruno Costa', turma: 'Turma A', educador: 'Educadora 1' }
  ]);

  assert.deepEqual(data.turmaSummary, [
    {
      turma: 'Turma A',
      totalCursistas: 3,
      naoAptos: 1,
      comChance: 1,
      percentualNaoAptos: 33.3,
      percentualComChance: 33.3
    },
    {
      turma: 'Turma B',
      totalCursistas: 2,
      naoAptos: 1,
      comChance: 1,
      percentualNaoAptos: 50,
      percentualComChance: 50
    }
  ]);
});

test('buildPriorityReportCsv includes institutional header, priority table and turma summary', () => {
  const data = buildPriorityReportData({ students }, { educador: 'Educadora 1' });
  const csv = buildPriorityReportCsv(data);

  assert.match(csv, /Projeto Nós na Rede/);
  assert.match(csv, /Logo do projeto;https:\/\/tiagosobraldelima\.github\.io\/nos-na-rede-dashboard\/assets\/nos-na-rede-logo\.png/);
  assert.match(csv, /Nome do cursista;Turma;Educador\(a\)/);
  assert.match(csv, /Ana Silva;Turma A;Educadora 1/);
  assert.match(csv, /Resumo geral por turma/);
  assert.match(csv, /Turma A;3;1;33,3%;1;33,3%/);
});

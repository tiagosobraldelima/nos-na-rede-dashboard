import test from 'node:test';
import assert from 'node:assert/strict';
import { CERTIFICATION_STATUS } from '../src/config.js';
import { buildProfileAnalytics } from '../src/profileModel.js';

function student(index, overrides = {}) {
  return {
    nome: `Cursista ${index}`,
    cpf: `0000000000${index}`,
    inscricao: `${1000 + index}`,
    turma: index <= 6 ? 'Turma A' : 'Turma B',
    municipio: 'Maceió',
    periodosValidos: 7,
    percentualFrequencia: 70,
    faltas: 3,
    situacao: CERTIFICATION_STATUS.acompanhamento,
    ...overrides
  };
}

test('buildProfileAnalytics links profiles and exposes only aggregate rows', () => {
  const students = Array.from({ length: 6 }, (_, index) => student(index + 1, {
    faltas: index === 0 ? 4 : 2,
    situacao: index === 0 ? CERTIFICATION_STATUS.naoApto : CERTIFICATION_STATUS.acompanhamento
  }));
  const profileRows = students.map((item) => ({
    cpf: item.cpf,
    n_inscricao: item.inscricao,
    nome_completo: item.nome,
    turma: item.turma,
    municipio: item.municipio,
    iden_genero: 'MULHER CISGÊNERO',
    raca_etnia: 'PARDA',
    vinculo_profissional: 'CONTRATO',
    nivel_de_formacao: 'ENSINO SUPERIOR COMPLETO',
    pcd: 'NÃO',
    telefone: '(82) 99999-9999',
    e_mail: 'pessoal@example.test'
  }));

  const analytics = buildProfileAnalytics(students, profileRows);

  assert.equal(analytics.coverage.matched, 6);
  assert.equal(analytics.coverage.percentMatched, 100);
  assert.ok(analytics.rows.length > 0);
  assert.equal(analytics.rows.some((row) => row.group === 'Mulher cisgênero'), true);
  assert.equal(JSON.stringify(analytics).includes('99999-9999'), false);
  assert.equal(JSON.stringify(analytics).includes('pessoal@example.test'), false);
  assert.equal(JSON.stringify(analytics).includes('00000000001'), false);
});

test('buildProfileAnalytics collapses small sensitive groups using the privacy threshold', () => {
  const students = Array.from({ length: 6 }, (_, index) => student(index + 1));
  const profileRows = students.map((item, index) => ({
    cpf: item.cpf,
    n_inscricao: item.inscricao,
    nome_completo: item.nome,
    turma: item.turma,
    municipio: item.municipio,
    iden_genero: index < 4 ? 'Mulher cisgênero' : 'Homem cisgênero',
    raca_etnia: index < 5 ? 'Parda' : 'Indígena',
    vinculo_profissional: 'Contrato',
    nivel_de_formacao: 'Ensino superior completo',
    pcd: 'Não'
  }));

  const analytics = buildProfileAnalytics(students, profileRows);
  const genderRows = analytics.rows.filter((row) => row.dimension === 'Identidade de gênero');

  assert.equal(genderRows.length, 1);
  assert.equal(genderRows[0].group, 'Outros/agrupado por privacidade');
  assert.equal(genderRows[0].total, 6);
  assert.ok(analytics.smallGroupsCollapsed >= 2);
});

test('buildProfileAnalytics reports unmatched attendance and profile-only records', () => {
  const students = [student(1), student(2)];
  const profileRows = [
    {
      cpf: students[0].cpf,
      n_inscricao: students[0].inscricao,
      nome_completo: students[0].nome,
      turma: students[0].turma,
      municipio: students[0].municipio,
      iden_genero: 'Não declarado'
    },
    {
      cpf: '99999999999',
      n_inscricao: '9999',
      nome_completo: 'Sem presença',
      turma: 'Turma C',
      municipio: 'Maceió'
    }
  ];

  const analytics = buildProfileAnalytics(students, profileRows);

  assert.equal(analytics.coverage.matched, 1);
  assert.equal(analytics.coverage.unmatchedAttendance, 1);
  assert.equal(analytics.coverage.profileOnly, 1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttendanceModel, applyFilters } from '../src/attendanceModel.js';
import { CERTIFICATION_STATUS } from '../src/config.js';

const baseRows = [
  {
    ord: '1',
    nome: 'ANA MARIA',
    cpf: '111',
    n_inscricao: 'A1',
    status_da_inscricao: 'INSCRITO',
    municipio: 'MACEIÓ',
    turma: 'AL-MACEIÓ',
    email: 'ana@example.com',
    educador_a: 'NAYARA VILELA',
    n_encontro: '1º',
    data_do_encontro: '2026-05-01',
    turno_1: 'PRESENTE',
    turno_2: 'AUSENTE',
    observacoes: ''
  },
  {
    ord: '2',
    nome: 'ANA MARIA',
    cpf: '111',
    n_inscricao: 'A1',
    status_da_inscricao: 'INSCRITO',
    municipio: 'MACEIÓ',
    turma: 'AL-MACEIÓ',
    email: 'ana@example.com',
    educador_a: 'NAYARA VILELA',
    n_encontro: '2º',
    data_do_encontro: '2026-05-08',
    turno_1: 'DISPENSADO',
    turno_2: 'ATESTADO MÉDICO',
    observacoes: ''
  },
  {
    ord: '3',
    nome: 'ANA MARIA',
    cpf: '111',
    n_inscricao: 'A1',
    status_da_inscricao: 'INSCRITO',
    municipio: 'MACEIÓ',
    turma: 'AL-MACEIÓ',
    email: 'ana@example.com',
    educador_a: 'NAYARA VILELA',
    n_encontro: '3º',
    data_do_encontro: '2026-05-15',
    turno_1: 'PRESENTE',
    turno_2: 'PRESENTE',
    observacoes: ''
  },
  {
    ord: '4',
    nome: 'BRUNO LIMA',
    cpf: '222',
    n_inscricao: 'B1',
    status_da_inscricao: 'INSCRITO',
    municipio: 'PIRANHAS',
    turma: 'AL-PIRANHAS',
    email: 'bruno@example.com',
    educador_a: 'NAYARA VILELA',
    n_encontro: '2º',
    data_do_encontro: '2026-05-08',
    turno_1: 'AUSENTE',
    turno_2: 'AUSENTE',
    observacoes: ''
  },
  {
    ord: '5',
    nome: 'BRUNO LIMA',
    cpf: '222',
    n_inscricao: 'B1',
    status_da_inscricao: 'INSCRITO',
    municipio: 'PIRANHAS',
    turma: 'AL-PIRANHAS',
    email: 'bruno@example.com',
    educador_a: 'NAYARA VILELA',
    n_encontro: '3º',
    data_do_encontro: '2026-05-15',
    turno_1: 'AUSENTE',
    turno_2: 'AUSENTE',
    observacoes: ''
  }
];

test('counts presence, absence, dispensa, atestado and certification status per cursista', () => {
  const model = buildAttendanceModel(baseRows);
  const ana = model.students.find((student) => student.nome === 'Ana Maria');

  assert.equal(ana.periodosPrevistos, 10);
  assert.equal(ana.presencas, 3);
  assert.equal(ana.faltas, 1);
  assert.equal(ana.dispensas, 2);
  assert.equal(ana.dispensasAutomaticas, 0);
  assert.equal(ana.periodosValidos, 5);
  assert.equal(ana.percentualFrequencia, 50);
  assert.equal(ana.situacao, CERTIFICATION_STATUS.acompanhamento);
});

test('creates automatic dispensa for cursista without first encounter launch', () => {
  const model = buildAttendanceModel(baseRows);
  const bruno = model.students.find((student) => student.nome === 'Bruno Lima');

  assert.equal(bruno.presencas, 0);
  assert.equal(bruno.faltas, 4);
  assert.equal(bruno.dispensasAutomaticas, 2);
  assert.equal(bruno.dispensas, 2);
  assert.equal(bruno.periodosValidos, 2);
  assert.equal(bruno.situacao, CERTIFICATION_STATUS.acompanhamento);
});

test('marks student as apt when valid periods reach seven', () => {
  const rows = [
    ...baseRows,
    { ...baseRows[0], n_encontro: '4º', turno_1: 'PRESENTE', turno_2: 'PRESENTE' }
  ];
  const model = buildAttendanceModel(rows);
  const ana = model.students.find((student) => student.nome === 'Ana Maria');

  assert.equal(ana.periodosValidos, 7);
  assert.equal(ana.situacao, CERTIFICATION_STATUS.apto);
});

test('marks student as not apt when remaining periods cannot reach seven', () => {
  const rows = [
    ...baseRows,
    {
      ...baseRows[3],
      nome: 'LANCAMENTO PIRANHAS',
      cpf: '999',
      n_inscricao: 'Z1',
      email: 'lancamento@example.com',
      n_encontro: '1º',
      turno_1: 'AUSENTE',
      turno_2: 'AUSENTE'
    },
    { ...baseRows[3], n_encontro: '4º', turno_1: 'AUSENTE', turno_2: 'AUSENTE' },
    { ...baseRows[3], n_encontro: '5º', turno_1: 'AUSENTE', turno_2: 'AUSENTE' }
  ];
  const model = buildAttendanceModel(rows);
  const bruno = model.students.find((student) => student.nome === 'Bruno Lima');

  assert.equal(bruno.periodosValidos, 2);
  assert.equal(bruno.periodosRestantesPossiveis, 0);
  assert.equal(bruno.situacao, CERTIFICATION_STATUS.naoApto);
});

test('counts critical students with two or three absences who cannot miss more periods', () => {
  const claraRows = [
    ['1º', 'PRESENTE', 'PRESENTE'],
    ['2º', 'PRESENTE', 'PRESENTE'],
    ['3º', 'PRESENTE', 'AUSENTE'],
    ['4º', 'AUSENTE', 'AUSENTE']
  ].map(([n_encontro, turno_1, turno_2], index) => ({
    ord: String(index + 1),
    nome: 'CLARA LIMA',
    cpf: '333',
    n_inscricao: 'C1',
    status_da_inscricao: 'INSCRITO',
    municipio: 'MACEIÓ',
    turma: 'AL-MACEIÓ',
    email: 'clara@example.com',
    educador_a: 'NAYARA VILELA',
    n_encontro,
    data_do_encontro: '2026-05-01',
    turno_1,
    turno_2,
    observacoes: ''
  }));
  const danielRows = [
    ['1º', 'PRESENTE', 'PRESENTE'],
    ['2º', 'PRESENTE', 'PRESENTE'],
    ['3º', 'AUSENTE', 'AUSENTE']
  ].map(([n_encontro, turno_1, turno_2], index) => ({
    ord: String(index + 10),
    nome: 'DANIEL ROCHA',
    cpf: '444',
    n_inscricao: 'D1',
    status_da_inscricao: 'INSCRITO',
    municipio: 'MACEIÓ',
    turma: 'AL-PIRANHAS',
    email: 'daniel@example.com',
    educador_a: 'NAYARA VILELA',
    n_encontro,
    data_do_encontro: '2026-05-01',
    turno_1,
    turno_2,
    observacoes: ''
  }));
  const model = buildAttendanceModel([...claraRows, ...danielRows]);

  const clara = model.students.find((student) => student.nome === 'Clara Lima');
  const daniel = model.students.find((student) => student.nome === 'Daniel Rocha');
  assert.equal(clara.faltas, 3);
  assert.equal(daniel.faltas, 2);
  assert.equal(clara.situacao, CERTIFICATION_STATUS.acompanhamento);
  assert.equal(daniel.situacao, CERTIFICATION_STATUS.acompanhamento);
  assert.equal(model.summary.naoPodemMaisFaltar, 2);
});

test('counts certification-ready students by zero to three absences for the KPI card', () => {
  const rows = [
    ['ANA', '111', 'A1', 'PRESENTE', 'PRESENTE'],
    ['BRUNO', '222', 'B1', 'PRESENTE', 'AUSENTE'],
    ['CLARA', '333', 'C1', 'AUSENTE', 'AUSENTE'],
    ['DANIEL', '444', 'D1', 'AUSENTE', 'AUSENTE']
  ].flatMap(([nome, cpf, inscricao, turno_1, turno_2], index) => ([
    {
      ord: String(index + 1),
      nome,
      cpf,
      n_inscricao: inscricao,
      status_da_inscricao: 'INSCRITO',
      municipio: 'MACEIÓ',
      turma: 'AL-MACEIÓ',
      email: `${nome.toLowerCase()}@example.com`,
      educador_a: 'NAYARA VILELA',
      n_encontro: '1º',
      data_do_encontro: '2026-05-01',
      turno_1,
      turno_2,
      observacoes: ''
    },
    {
      ord: String(index + 10),
      nome,
      cpf,
      n_inscricao: inscricao,
      status_da_inscricao: 'INSCRITO',
      municipio: 'MACEIÓ',
      turma: 'AL-MACEIÓ',
      email: `${nome.toLowerCase()}@example.com`,
      educador_a: 'NAYARA VILELA',
      n_encontro: '2º',
      data_do_encontro: '2026-05-08',
      turno_1: index === 3 ? 'AUSENTE' : 'PRESENTE',
      turno_2: index === 3 ? 'AUSENTE' : 'PRESENTE',
      observacoes: ''
    }
  ]));
  const model = buildAttendanceModel(rows);

  assert.equal(model.students.find((student) => student.nome === 'Daniel').faltas, 4);
  assert.equal(model.summary.aptosCertificacao, 3);
});

test('aggregates summary and filters by turma, municipio, educator, situation and inscription status', () => {
  const model = buildAttendanceModel(baseRows);
  const filtered = applyFilters(model, {
    turma: 'AL-MACEIÓ',
    municipio: 'Maceió',
    educador: 'Nayara Vilela',
    situacao: CERTIFICATION_STATUS.acompanhamento,
    statusInscricao: 'INSCRITO',
    encontro: 'Todos',
    busca: ''
  });

  assert.equal(filtered.students.length, 1);
  assert.equal(filtered.summary.totalCursistas, 1);
  assert.equal(filtered.summary.totalTurmas, 1);
  assert.equal(filtered.summary.totalMunicipios, 1);
  assert.equal(filtered.summary.totalEducadores, 1);
  assert.equal(filtered.summary.periodosPorCursista, 10);
  assert.equal(filtered.summary.periodosPrevistosTotal, 10);
});

test('filters by complementary profile fields and protects small sensitive cuts', () => {
  const model = buildAttendanceModel(baseRows);
  const students = model.students.map((student) => ({
    ...student,
    perfil: student.nome === 'Ana Maria'
      ? {
        genero: 'Mulher cisgênero',
        racaEtnia: 'Parda',
        vinculoProfissional: 'Contrato'
      }
      : {
        genero: 'Homem cisgênero',
        racaEtnia: 'Branca',
        vinculoProfissional: 'Estatutário'
      }
  }));
  const filtered = applyFilters({ ...model, students }, {
    turma: 'Todos',
    municipio: 'Todos',
    educador: 'Todos',
    genero: 'Mulher cisgênero',
    racaEtnia: 'Parda',
    vinculoProfissional: 'Contrato',
    situacao: 'Todos',
    statusInscricao: 'Todos',
    encontro: 'Todos',
    busca: ''
  });

  assert.deepEqual(filtered.students.map((student) => student.nome), ['Ana Maria']);
  assert.equal(filtered.summary.totalCursistas, 1);
  assert.equal(filtered.privacyBlocked, true);
  assert.match(filtered.privacyMessage, /menos de 5/);
});

test('aggregates breakdown by certification situation', () => {
  const model = buildAttendanceModel(baseRows);

  assert.deepEqual(model.breakdowns.bySituacao, [
    {
      nome: CERTIFICATION_STATUS.acompanhamento,
      cursistas: 2,
      aptos: 0,
      acompanhamento: 2,
      naoAptos: 0,
      frequenciaMedia: 35
    }
  ]);
});

test('aggregates breakdown by inscription status', () => {
  const rows = [
    ...baseRows,
    {
      ord: '6',
      nome: 'CARLA SOUZA',
      cpf: '333',
      n_inscricao: 'C1',
      status_da_inscricao: 'CANCELADO',
      municipio: 'PIRANHAS',
      turma: 'AL-PIRANHAS',
      email: 'carla@example.com',
      educador_a: 'NAYARA VILELA',
      n_encontro: '1º',
      data_do_encontro: '2026-05-01',
      turno_1: 'PRESENTE',
      turno_2: 'PRESENTE',
      observacoes: ''
    }
  ];
  const model = buildAttendanceModel(rows);

  assert.deepEqual(model.breakdowns.byStatusInscricao, [
    {
      nome: 'INSCRITO',
      cursistas: 2,
      aptos: 0,
      acompanhamento: 1,
      naoAptos: 1,
      frequenciaMedia: 35
    },
    {
      nome: 'CANCELADO',
      cursistas: 1,
      aptos: 0,
      acompanhamento: 0,
      naoAptos: 1,
      frequenciaMedia: 20
    }
  ]);
});

test('calculates remaining possible periods from launched encounters in the student turma', () => {
  const rows = [
    ...[1, 2, 3, 4, 5].map((encontro) => ({
      ord: `ADV-${encontro}`,
      nome: 'TURMA AVANCADA',
      cpf: '444',
      n_inscricao: 'D1',
      status_da_inscricao: 'INSCRITO',
      municipio: 'MACEIÓ',
      turma: 'AL-AVANCADA',
      email: 'avancada@example.com',
      educador_a: 'NAYARA VILELA',
      n_encontro: `${encontro}º`,
      data_do_encontro: `2026-05-${String(encontro).padStart(2, '0')}`,
      turno_1: 'AUSENTE',
      turno_2: 'AUSENTE',
      observacoes: ''
    })),
    {
      ord: 'LAG-1',
      nome: 'TURMA EM ANDAMENTO',
      cpf: '555',
      n_inscricao: 'E1',
      status_da_inscricao: 'INSCRITO',
      municipio: 'PIRANHAS',
      turma: 'AL-EM-ANDAMENTO',
      email: 'andamento@example.com',
      educador_a: 'NAYARA VILELA',
      n_encontro: '1º',
      data_do_encontro: '2026-05-01',
      turno_1: 'PRESENTE',
      turno_2: 'PRESENTE',
      observacoes: ''
    },
    {
      ord: 'LAG-2',
      nome: 'TURMA EM ANDAMENTO',
      cpf: '555',
      n_inscricao: 'E1',
      status_da_inscricao: 'INSCRITO',
      municipio: 'PIRANHAS',
      turma: 'AL-EM-ANDAMENTO',
      email: 'andamento@example.com',
      educador_a: 'NAYARA VILELA',
      n_encontro: '2º',
      data_do_encontro: '2026-05-08',
      turno_1: 'AUSENTE',
      turno_2: 'AUSENTE',
      observacoes: ''
    }
  ];
  const model = buildAttendanceModel(rows);
  const student = model.students.find((item) => item.turma === 'AL-EM-ANDAMENTO');

  assert.equal(student.periodosValidos, 2);
  assert.equal(student.periodosRestantesPossiveis, 6);
  assert.equal(student.situacao, CERTIFICATION_STATUS.acompanhamento);
});

test('filters by encounter keeping only students with a launch in that encounter', () => {
  const rows = [
    ...baseRows,
    {
      ord: '6',
      nome: 'CARLA SOUZA',
      cpf: '333',
      n_inscricao: 'C1',
      status_da_inscricao: 'INSCRITO',
      municipio: 'PIRANHAS',
      turma: 'AL-PIRANHAS',
      email: 'carla@example.com',
      educador_a: 'NAYARA VILELA',
      n_encontro: '1º',
      data_do_encontro: '2026-05-01',
      turno_1: 'PRESENTE',
      turno_2: 'PRESENTE',
      observacoes: ''
    }
  ];
  const model = buildAttendanceModel(rows);
  const filtered = applyFilters(model, {
    turma: 'Todos',
    municipio: 'Todos',
    educador: 'Todos',
    situacao: 'Todos',
    statusInscricao: 'Todos',
    encontro: '2º encontro',
    busca: ''
  });

  assert.deepEqual(filtered.students.map((student) => student.nome), ['Ana Maria', 'Bruno Lima']);
  assert.equal(filtered.summary.totalCursistas, 2);
  assert.equal(filtered.summary.periodosPrevistosTotal, 20);
  assert.equal(filtered.breakdowns.byTurma.length, 2);
});

test('filters first encounter including students with automatic dispensa', () => {
  const model = buildAttendanceModel(baseRows);
  const filtered = applyFilters(model, {
    turma: 'Todos',
    municipio: 'Todos',
    educador: 'Todos',
    situacao: 'Todos',
    statusInscricao: 'Todos',
    encontro: '1º encontro',
    busca: ''
  });

  assert.deepEqual(filtered.students.map((student) => student.nome), ['Ana Maria', 'Bruno Lima']);
});

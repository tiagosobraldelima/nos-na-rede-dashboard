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
  assert.equal(bruno.situacao, CERTIFICATION_STATUS.naoApto);
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
    { ...baseRows[3], n_encontro: '4º', turno_1: 'AUSENTE', turno_2: 'AUSENTE' },
    { ...baseRows[3], n_encontro: '5º', turno_1: 'AUSENTE', turno_2: 'AUSENTE' }
  ];
  const model = buildAttendanceModel(rows);
  const bruno = model.students.find((student) => student.nome === 'Bruno Lima');

  assert.equal(bruno.periodosValidos, 2);
  assert.equal(bruno.periodosRestantesPossiveis, 0);
  assert.equal(bruno.situacao, CERTIFICATION_STATUS.naoApto);
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

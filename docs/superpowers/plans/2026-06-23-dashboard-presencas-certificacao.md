# Dashboard de Presenças e Certificação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a source-backed GitHub Pages dashboard for monitoring attendance, absences, dispensas, risk, and presencial certification status for Projeto Nós na Rede.

**Architecture:** Replace the current single generated dashboard page with a small static web app: `index.html` for structure, `style.css` for the preserved Nós na Rede visual identity, and focused ES modules under `src/` for CSV loading, normalization, calculation, filtering, charting, and rendering. The attendance/certification calculation model is isolated and tested with Node's built-in test runner before UI work.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript ES modules, Chart.js from CDN, Node.js built-in `node:test` and `assert/strict`, GitHub Pages.

---

## File structure

- Create `package.json`: test scripts for the calculation and CSV modules.
- Replace `index.html`: static dashboard shell, CDN imports, semantic containers, and module entrypoint.
- Create `style.css`: visual identity, responsive layout, cards, filters, badges, table, and alert styles.
- Create `src/config.js`: source URL, constants, status labels, and color palette.
- Create `src/text.js`: column/value normalization helpers and Portuguese formatting.
- Create `src/csv.js`: RFC-compatible CSV parser, fetch helper, and row normalization.
- Create `src/attendanceModel.js`: cursista consolidation, attendance counting, automatic dispensa rule, certification status, aggregations, and filters.
- Create `src/charts.js`: Chart.js lifecycle and chart rendering functions.
- Create `src/render.js`: DOM rendering for cards, filters, alerts, rankings, and individual table.
- Create `src/main.js`: app orchestration, refresh loop, event handlers, and error display.
- Create `tests/attendanceModel.test.mjs`: core calculation tests.
- Create `tests/csv.test.mjs`: CSV parser and column normalization tests.
- Create or replace `README.md`: project description, Google Sheets integration, calculation rules, validation, and publishing instructions.
- Keep `assets/favicon.png`: official favicon already present.
- Keep `docs/superpowers/specs/2026-06-23-dashboard-presencas-certificacao-design.md`: approved design source of truth.

## Task 1: Add test runner and shared configuration

**Files:**
- Create: `package.json`
- Create: `src/config.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "nos-na-rede-dashboard-presencas",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "test:attendance": "node --test tests/attendanceModel.test.mjs",
    "test:csv": "node --test tests/csv.test.mjs",
    "serve": "python3 -m http.server 8080"
  }
}
```

- [ ] **Step 2: Create `src/config.js`**

```js
export const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQoGnE2RG9yDysuCwJubfxoJcbbdC8yfeguHrKOXwxyiIGAKxy71hvp8Uow4-3gucHLQlBOqp24NdaU/pub?gid=1700106572&single=true&output=csv';

export const TOTAL_ENCOUNTERS = 5;
export const PERIODS_PER_ENCOUNTER = 2;
export const TOTAL_PERIODS = TOTAL_ENCOUNTERS * PERIODS_PER_ENCOUNTER;
export const MIN_VALID_PERIODS = 7;
export const REFRESH_INTERVAL_MS = 60_000;

export const CERTIFICATION_STATUS = {
  apto: 'Apto pelo critério de frequência',
  acompanhamento: 'Em acompanhamento',
  naoApto: 'Não apto pelo critério de frequência'
};

export const PERIOD_STATUS = {
  presente: 'PRESENTE',
  ausente: 'AUSENTE',
  dispensado: 'DISPENSADO',
  atestado: 'ATESTADO MÉDICO',
  semRegistro: 'SEM REGISTRO'
};

export const COLORS = {
  ink: '#1a1a1a',
  muted: '#5f646d',
  blue: '#2f80c1',
  cyan: '#33a6d9',
  pink: '#ed4f9a',
  yellow: '#f2cf43',
  red: '#e94b3c',
  green: '#78bd43',
  card: '#fbfbfb',
  line: '#d8dde5'
};
```

- [ ] **Step 3: Run baseline tests and verify the expected no-test failure**

Run: `npm test`

Expected: command exits non-zero because `tests/*.test.mjs` does not exist yet. This confirms the test runner is wired but no tests have been created.

- [ ] **Step 4: Commit**

```bash
git add package.json src/config.js
git commit -m "chore: adiciona base de testes e configuracoes do painel"
```

## Task 2: Test and implement text normalization helpers

**Files:**
- Create: `src/text.js`
- Create: `tests/csv.test.mjs`

- [ ] **Step 1: Write failing normalization tests in `tests/csv.test.mjs`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeColumnName, normalizeValue, titleCasePtBr } from '../src/text.js';

test('normalizes column names with accents, spaces, punctuation and case', () => {
  assert.equal(normalizeColumnName(' EDUCADOR(A) '), 'educador_a');
  assert.equal(normalizeColumnName('Nº INSCRIÇÃO'), 'n_inscricao');
  assert.equal(normalizeColumnName('1º TURNO'), 'turno_1');
  assert.equal(normalizeColumnName('2º TURNO'), 'turno_2');
});

test('normalizes attendance values with accents and extra spaces', () => {
  assert.equal(normalizeValue('  atestado médico  '), 'ATESTADO MEDICO');
  assert.equal(normalizeValue('Dispensado'), 'DISPENSADO');
  assert.equal(normalizeValue(''), '');
});

test('formats Portuguese names while preserving connector words', () => {
  assert.equal(titleCasePtBr('SÃO JOSÉ DA TAPERA'), 'São José da Tapera');
  assert.equal(titleCasePtBr("OLHO D'ÁGUA DAS FLORES"), "Olho d'Água das Flores");
});
```

- [ ] **Step 2: Run the failing test**

Run: `npm run test:csv`

Expected: FAIL with module not found for `../src/text.js`.

- [ ] **Step 3: Implement `src/text.js`**

```js
const ACCENT_MAP = {
  Á: 'A', À: 'A', Â: 'A', Ã: 'A', Ä: 'A',
  É: 'E', È: 'E', Ê: 'E', Ë: 'E',
  Í: 'I', Ì: 'I', Î: 'I', Ï: 'I',
  Ó: 'O', Ò: 'O', Ô: 'O', Õ: 'O', Ö: 'O',
  Ú: 'U', Ù: 'U', Û: 'U', Ü: 'U',
  Ç: 'C'
};

export function removeAccents(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ]/g, char => ACCENT_MAP[char] ?? char);
}

export function normalizeValue(value) {
  return removeAccents(value).trim().replace(/\s+/g, ' ').toUpperCase();
}

export function normalizeColumnName(value) {
  const normalized = normalizeValue(value)
    .replace(/^1O TURNO$|^1 TURNO$|^1º TURNO$/i, 'TURNO 1')
    .replace(/^2O TURNO$|^2 TURNO$|^2º TURNO$/i, 'TURNO 2')
    .replace(/^N.? INSCRICAO$/i, 'N INSCRICAO');

  return normalized
    .toLowerCase()
    .replace(/\(([^)]*)\)/g, '_$1')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^turno_1$/, 'turno_1')
    .replace(/^turno_2$/, 'turno_2')
    .replace(/^n_inscricao$/, 'n_inscricao');
}

export function titleCasePtBr(value) {
  const connectors = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas', 'para']);
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && connectors.has(word)) return word;
      if (word.includes("'")) {
        return word.split("'").map((part, partIndex) => {
          if (partIndex === 0 && part.length === 1) return part;
          return part.charAt(0).toUpperCase() + part.slice(1);
        }).join("'");
      }
      return word.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('-');
    })
    .join(' ');
}

export function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:csv`

Expected: PASS for all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/text.js tests/csv.test.mjs
git commit -m "test: cobre normalizacao de colunas e valores"
```

## Task 3: Test and implement the attendance calculation model

**Files:**
- Create: `tests/attendanceModel.test.mjs`
- Create: `src/attendanceModel.js`

- [ ] **Step 1: Write failing model tests in `tests/attendanceModel.test.mjs`**

```js
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
  const ana = model.students.find(student => student.nome === 'Ana Maria');

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
  const bruno = model.students.find(student => student.nome === 'Bruno Lima');

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
  const ana = model.students.find(student => student.nome === 'Ana Maria');

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
  const bruno = model.students.find(student => student.nome === 'Bruno Lima');

  assert.equal(bruno.periodosValidos, 2);
  assert.equal(bruno.periodosRestantesPossiveis, 0);
  assert.equal(bruno.situacao, CERTIFICATION_STATUS.naoApto);
});

test('aggregates summary and filters by turma, municipio, educator and situation', () => {
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
```

- [ ] **Step 2: Run the failing model tests**

Run: `npm run test:attendance`

Expected: FAIL with module not found for `../src/attendanceModel.js`.

- [ ] **Step 3: Implement `src/attendanceModel.js`**

```js
import {
  CERTIFICATION_STATUS,
  MIN_VALID_PERIODS,
  PERIODS_PER_ENCOUNTER,
  PERIOD_STATUS,
  TOTAL_ENCOUNTERS,
  TOTAL_PERIODS
} from './config.js';
import { normalizeValue, percent, titleCasePtBr } from './text.js';

function encounterNumber(rawValue) {
  const match = String(rawValue ?? '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function studentKey(row) {
  const cpf = String(row.cpf ?? '').trim();
  const inscricao = String(row.n_inscricao ?? '').trim();
  if (cpf || inscricao) return `${cpf}::${inscricao}`;
  return [
    row.nome ?? '',
    row.email ?? '',
    row.turma ?? '',
    row.municipio ?? ''
  ].map(value => normalizeValue(value)).join('::');
}

function classifyPeriod(rawStatus, encounter, hasRow) {
  const value = normalizeValue(rawStatus);
  if (value === 'PRESENTE') return 'presente';
  if (value === 'AUSENTE') return 'ausente';
  if (value === 'DISPENSADO') return 'dispensado';
  if (value === 'ATESTADO MEDICO') return 'atestado';
  if (encounter === 1 && (!hasRow || value === '')) return 'dispensaAutomatica';
  return 'semRegistro';
}

function createStudent(row) {
  return {
    id: studentKey(row),
    nome: titleCasePtBr(row.nome),
    cpf: String(row.cpf ?? '').trim(),
    inscricao: String(row.n_inscricao ?? '').trim(),
    statusInscricao: normalizeValue(row.status_da_inscricao || 'INSCRITO'),
    municipio: titleCasePtBr(row.municipio || 'Não informado'),
    turma: String(row.turma || 'Não informada').trim(),
    email: String(row.email ?? '').trim(),
    educador: titleCasePtBr(row.educador_a || 'Não informado'),
    encontros: new Map()
  };
}

function addEncounter(student, row) {
  const encontro = encounterNumber(row.n_encontro);
  if (!encontro || encontro > TOTAL_ENCOUNTERS) return;
  student.encontros.set(encontro, {
    encontro,
    data: String(row.data_do_encontro ?? '').trim(),
    turno1: row.turno_1 ?? '',
    turno2: row.turno_2 ?? '',
    observacoes: String(row.observacoes ?? '').trim()
  });
}

function finalizeStudent(student, launchedEncounters) {
  const counts = {
    presencas: 0,
    faltas: 0,
    dispensasExplicitas: 0,
    atestados: 0,
    dispensasAutomaticas: 0,
    semRegistro: 0
  };
  const periods = [];

  for (let encontro = 1; encontro <= TOTAL_ENCOUNTERS; encontro += 1) {
    const record = student.encontros.get(encontro);
    const statuses = record ? [record.turno1, record.turno2] : ['', ''];
    for (let periodo = 1; periodo <= PERIODS_PER_ENCOUNTER; periodo += 1) {
      const type = classifyPeriod(statuses[periodo - 1], encontro, Boolean(record));
      if (type === 'presente') counts.presencas += 1;
      if (type === 'ausente') counts.faltas += 1;
      if (type === 'dispensado') counts.dispensasExplicitas += 1;
      if (type === 'atestado') counts.atestados += 1;
      if (type === 'dispensaAutomatica') counts.dispensasAutomaticas += 1;
      if (type === 'semRegistro') counts.semRegistro += 1;
      periods.push({ encontro, periodo, type });
    }
  }

  const dispensas = counts.dispensasExplicitas + counts.atestados + counts.dispensasAutomaticas;
  const periodosValidos = counts.presencas + dispensas;
  const encontrosLancados = launchedEncounters.size;
  const periodosRestantesPossiveis = Math.max(0, (TOTAL_ENCOUNTERS - encontrosLancados) * PERIODS_PER_ENCOUNTER);
  let situacao = CERTIFICATION_STATUS.acompanhamento;
  if (periodosValidos >= MIN_VALID_PERIODS) situacao = CERTIFICATION_STATUS.apto;
  else if (periodosValidos + periodosRestantesPossiveis < MIN_VALID_PERIODS) situacao = CERTIFICATION_STATUS.naoApto;

  let observacao = 'Atenção: ainda depende de novos registros para atingir o mínimo.';
  if (situacao === CERTIFICATION_STATUS.apto) observacao = 'Apto: já cumpriu o mínimo presencial.';
  if (situacao === CERTIFICATION_STATUS.naoApto) observacao = 'Não apto: não consegue mais atingir 7 períodos válidos.';
  if (situacao === CERTIFICATION_STATUS.acompanhamento && periodosValidos + periodosRestantesPossiveis <= MIN_VALID_PERIODS) {
    observacao = 'Risco alto: precisa validar todos os períodos restantes.';
  }

  return {
    ...student,
    encontros: Object.fromEntries(student.encontros),
    periods,
    periodosPrevistos: TOTAL_PERIODS,
    presencas: counts.presencas,
    faltas: counts.faltas,
    dispensas,
    dispensasExplicitas: counts.dispensasExplicitas,
    atestados: counts.atestados,
    dispensasAutomaticas: counts.dispensasAutomaticas,
    semRegistro: counts.semRegistro,
    periodosValidos,
    percentualFrequencia: percent(periodosValidos, TOTAL_PERIODS),
    periodosRestantesPossiveis,
    situacao,
    observacao
  };
}

function uniqueCount(items, selector) {
  return new Set(items.map(selector).filter(Boolean)).size;
}

function buildSummary(students) {
  const totalCursistas = students.length;
  const aptos = students.filter(student => student.situacao === CERTIFICATION_STATUS.apto).length;
  const acompanhamento = students.filter(student => student.situacao === CERTIFICATION_STATUS.acompanhamento).length;
  const naoAptos = students.filter(student => student.situacao === CERTIFICATION_STATUS.naoApto).length;
  const presencas = students.reduce((sum, student) => sum + student.presencas, 0);
  const faltas = students.reduce((sum, student) => sum + student.faltas, 0);
  const dispensas = students.reduce((sum, student) => sum + student.dispensas, 0);
  const validos = students.reduce((sum, student) => sum + student.periodosValidos, 0);

  return {
    totalCursistas,
    totalTurmas: uniqueCount(students, student => student.turma),
    totalMunicipios: uniqueCount(students, student => student.municipio),
    totalEducadores: uniqueCount(students, student => student.educador),
    periodosPorCursista: TOTAL_PERIODS,
    periodosPrevistosTotal: totalCursistas * TOTAL_PERIODS,
    presencas,
    faltas,
    dispensas,
    percentualGeralFrequencia: percent(validos, totalCursistas * TOTAL_PERIODS),
    aptos,
    acompanhamento,
    naoAptos,
    percentualAptos: percent(aptos, totalCursistas),
    percentualAcompanhamento: percent(acompanhamento, totalCursistas),
    percentualNaoAptos: percent(naoAptos, totalCursistas)
  };
}

function buildBreakdowns(students) {
  const byEncounter = Array.from({ length: TOTAL_ENCOUNTERS }, (_, index) => ({
    encontro: `${index + 1}º encontro`,
    presencas: 0,
    faltas: 0,
    dispensas: 0,
    semRegistro: 0
  }));

  for (const student of students) {
    for (const period of student.periods) {
      const bucket = byEncounter[period.encontro - 1];
      if (period.type === 'presente') bucket.presencas += 1;
      else if (period.type === 'ausente') bucket.faltas += 1;
      else if (['dispensado', 'atestado', 'dispensaAutomatica'].includes(period.type)) bucket.dispensas += 1;
      else bucket.semRegistro += 1;
    }
  }

  const groupBy = dimension => {
    const map = new Map();
    for (const student of students) {
      const key = student[dimension] || 'Não informado';
      if (!map.has(key)) map.set(key, { nome: key, cursistas: 0, aptos: 0, acompanhamento: 0, naoAptos: 0, frequenciaMedia: 0 });
      const item = map.get(key);
      item.cursistas += 1;
      if (student.situacao === CERTIFICATION_STATUS.apto) item.aptos += 1;
      if (student.situacao === CERTIFICATION_STATUS.acompanhamento) item.acompanhamento += 1;
      if (student.situacao === CERTIFICATION_STATUS.naoApto) item.naoAptos += 1;
      item.frequenciaMedia += student.percentualFrequencia;
    }
    return [...map.values()].map(item => ({
      ...item,
      frequenciaMedia: Math.round((item.frequenciaMedia / item.cursistas) * 10) / 10
    })).sort((a, b) => b.cursistas - a.cursistas || a.nome.localeCompare(b.nome));
  };

  return {
    byEncounter,
    byTurma: groupBy('turma'),
    byMunicipio: groupBy('municipio'),
    byEducador: groupBy('educador')
  };
}

export function buildAttendanceModel(rows) {
  const studentsByKey = new Map();
  const launchedEncounters = new Set();

  for (const row of rows) {
    const key = studentKey(row);
    if (!studentsByKey.has(key)) studentsByKey.set(key, createStudent(row));
    addEncounter(studentsByKey.get(key), row);
    const encontro = encounterNumber(row.n_encontro);
    if (encontro) launchedEncounters.add(encontro);
  }

  const students = [...studentsByKey.values()]
    .map(student => finalizeStudent(student, launchedEncounters))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return {
    students,
    launchedEncounters: [...launchedEncounters].sort((a, b) => a - b),
    summary: buildSummary(students),
    breakdowns: buildBreakdowns(students),
    options: {
      turmas: [...new Set(students.map(student => student.turma))].sort(),
      municipios: [...new Set(students.map(student => student.municipio))].sort(),
      educadores: [...new Set(students.map(student => student.educador))].sort(),
      statusInscricao: [...new Set(students.map(student => student.statusInscricao))].sort()
    }
  };
}

export function applyFilters(model, filters) {
  const busca = normalizeValue(filters.busca || '');
  const students = model.students.filter(student => {
    const matchesBusca = !busca || normalizeValue([
      student.nome,
      student.cpf,
      student.inscricao,
      student.turma,
      student.municipio,
      student.educador
    ].join(' ')).includes(busca);
    return matchesBusca
      && (!filters.turma || filters.turma === 'Todos' || student.turma === filters.turma)
      && (!filters.municipio || filters.municipio === 'Todos' || student.municipio === filters.municipio)
      && (!filters.educador || filters.educador === 'Todos' || student.educador === filters.educador)
      && (!filters.situacao || filters.situacao === 'Todos' || student.situacao === filters.situacao)
      && (!filters.statusInscricao || filters.statusInscricao === 'Todos' || student.statusInscricao === filters.statusInscricao);
  });

  return {
    ...model,
    students,
    summary: buildSummary(students),
    breakdowns: buildBreakdowns(students)
  };
}
```

- [ ] **Step 4: Run model tests**

Run: `npm run test:attendance`

Expected: PASS for all 5 tests.

- [ ] **Step 5: Run full tests**

Run: `npm test`

Expected: PASS for all CSV and attendance tests.

- [ ] **Step 6: Commit**

```bash
git add src/attendanceModel.js tests/attendanceModel.test.mjs
git commit -m "test: cobre regras de frequencia e certificacao"
```

## Task 4: Test and implement CSV parsing and Google Sheets loading

**Files:**
- Modify: `tests/csv.test.mjs`
- Create: `src/csv.js`

- [ ] **Step 1: Add failing CSV parser tests to `tests/csv.test.mjs`**

Append this test code to the existing file:

```js
import { parseCsv, normalizeRows } from '../src/csv.js';

test('parses quoted CSV values and normalizes sheet columns', () => {
  const csv = [
    'NOME,CPF,Nº INSCRIÇÃO,MUNICÍPIO,TURMA,EDUCADOR(A),Nº ENCONTRO,1º TURNO,2º TURNO,OBSERVAÇÕES',
    '"ANA, MARIA",111,A1,MACEIÓ,AL-MACEIÓ,NAYARA,1º,PRESENTE,AUSENTE,"registro conferido"'
  ].join('\n');

  const rows = normalizeRows(parseCsv(csv));

  assert.equal(rows.length, 1);
  assert.equal(rows[0].nome, 'ANA, MARIA');
  assert.equal(rows[0].cpf, '111');
  assert.equal(rows[0].n_inscricao, 'A1');
  assert.equal(rows[0].municipio, 'MACEIÓ');
  assert.equal(rows[0].educador_a, 'NAYARA');
  assert.equal(rows[0].turno_1, 'PRESENTE');
  assert.equal(rows[0].turno_2, 'AUSENTE');
});
```

- [ ] **Step 2: Run the failing CSV tests**

Run: `npm run test:csv`

Expected: FAIL with module not found for `../src/csv.js`.

- [ ] **Step 3: Implement `src/csv.js`**

```js
import { SHEET_CSV_URL } from './config.js';
import { normalizeColumnName } from './text.js';

export function parseCsv(csvText) {
  const rows = [];
  let currentRow = [];
  let currentValue = '';
  let insideQuotes = false;
  const text = String(csvText ?? '').replace(/^\uFEFF/, '');

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && insideQuotes && next === '"') {
      currentValue += '"';
      index += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  const header = rows.shift() ?? [];
  return rows
    .filter(row => row.some(value => String(value).trim() !== ''))
    .map(row => Object.fromEntries(header.map((column, index) => [column.trim(), String(row[index] ?? '').trim()])));
}

export function normalizeRows(rows) {
  return rows.map(row => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeColumnName(key)] = value;
    }
    return normalized;
  });
}

export async function fetchSheetRows(fetchImpl = fetch) {
  const separator = SHEET_CSV_URL.includes('?') ? '&' : '?';
  const response = await fetchImpl(`${SHEET_CSV_URL}${separator}cacheBust=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Não foi possível carregar a planilha (${response.status} ${response.statusText}).`);
  }
  const csvText = await response.text();
  return normalizeRows(parseCsv(csvText));
}
```

- [ ] **Step 4: Run CSV tests**

Run: `npm run test:csv`

Expected: PASS for all CSV tests.

- [ ] **Step 5: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/csv.js tests/csv.test.mjs
git commit -m "feat: carrega e normaliza csv do google sheets"
```

## Task 5: Build the dashboard shell and visual identity

**Files:**
- Replace: `index.html`
- Create: `style.css`

- [ ] **Step 1: Replace `index.html` with the dashboard shell**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard de Presenças e Certificação - Nós na Rede</title>
  <link rel="icon" type="image/png" href="assets/favicon.png" sizes="32x32">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Slackey&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script type="module" src="src/main.js"></script>
</head>
<body>
  <div class="background-shapes" aria-hidden="true"></div>

  <header class="site-header">
    <div>
      <p class="eyebrow">Projeto Nós na Rede</p>
      <h1>Controle de presenças e certificação</h1>
      <p class="lead">Acompanhamento operacional de presenças, faltas, dispensas e risco de certificação presencial.</p>
    </div>
    <div class="source-status">
      <span id="loadStatus" class="status-pill">Carregando planilha...</span>
      <span id="lastUpdated">Última atualização: --</span>
    </div>
  </header>

  <main class="dashboard">
    <section class="filters-card" aria-label="Filtros do dashboard">
      <div class="filter-grid">
        <label>Turma<select id="filterTurma"></select></label>
        <label>Município<select id="filterMunicipio"></select></label>
        <label>Educador(a)<select id="filterEducador"></select></label>
        <label>Encontro<select id="filterEncontro"></select></label>
        <label>Situação<select id="filterSituacao"></select></label>
        <label>Status inscrição<select id="filterStatusInscricao"></select></label>
        <label class="search-label">Busca<input id="filterBusca" type="search" placeholder="Nome, CPF, inscrição, turma..."></label>
      </div>
    </section>

    <section id="kpiGrid" class="kpi-grid" aria-label="Indicadores principais"></section>

    <section class="content-grid">
      <article class="panel risk-panel">
        <div class="panel-heading">
          <p class="eyebrow">Atenção</p>
          <h2>Cursistas em risco</h2>
        </div>
        <div id="riskList" class="risk-list"></div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Certificação</p>
          <h2>Situação geral</h2>
        </div>
        <canvas id="statusChart" height="220"></canvas>
      </article>
    </section>

    <section class="charts-grid">
      <article class="panel panel-wide">
        <div class="panel-heading">
          <p class="eyebrow">Encontros presenciais</p>
          <h2>Presença, falta e dispensa por encontro</h2>
        </div>
        <canvas id="encounterChart" height="280"></canvas>
      </article>
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Turmas</p>
          <h2>Acompanhamento por turma</h2>
        </div>
        <canvas id="turmaChart" height="280"></canvas>
      </article>
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Municípios</p>
          <h2>Acompanhamento por município</h2>
        </div>
        <canvas id="municipioChart" height="280"></canvas>
      </article>
      <article class="panel panel-wide">
        <div class="panel-heading">
          <p class="eyebrow">Educadores</p>
          <h2>Acompanhamento por educador(a)</h2>
        </div>
        <canvas id="educadorChart" height="280"></canvas>
      </article>
    </section>

    <section class="panel table-panel">
      <div class="panel-heading split">
        <div>
          <p class="eyebrow">Consulta individual</p>
          <h2>Situação de cada cursista</h2>
        </div>
        <button id="resetFilters" type="button">Limpar filtros</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Turma</th>
              <th>Município</th>
              <th>Educador(a)</th>
              <th>Pres.</th>
              <th>Faltas</th>
              <th>Disp.</th>
              <th>Válidos</th>
              <th>% freq.</th>
              <th>Situação</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody id="studentTable"></tbody>
        </table>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <span>Projeto Nós na Rede</span>
    <span>Fonte: Google Sheets publicado em CSV</span>
    <span>Critério presencial: 7 de 10 períodos válidos</span>
  </footer>
</body>
</html>
```

- [ ] **Step 2: Create `style.css` with the preserved identity**

Use the final implementation to include the Nós na Rede palette variables, animated soft shapes, responsive grid, glass cards, badges, chart containers, and mobile table handling. The file must include these selectors: `:root`, `body`, `.background-shapes`, `.site-header`, `.dashboard`, `.filters-card`, `.kpi-grid`, `.kpi-card`, `.panel`, `.risk-list`, `.charts-grid`, `.table-wrap`, `.badge`, `.site-footer`, and a `@media (max-width: 760px)` block.

- [ ] **Step 3: Commit**

```bash
git add index.html style.css
git commit -m "feat: cria estrutura visual do dashboard de presencas"
```

## Task 6: Build rendering, filters and charts

**Files:**
- Create: `src/render.js`
- Create: `src/charts.js`
- Create: `src/main.js`

- [ ] **Step 1: Create `src/render.js`**

Implement these exported functions:

- `populateFilters(model, currentFilters)`: fills `#filterTurma`, `#filterMunicipio`, `#filterEducador`, `#filterSituacao`, `#filterStatusInscricao`, and `#filterEncontro` with `Todos` as the first option. It uses `model.options.turmas`, `model.options.municipios`, `model.options.educadores`, `model.options.statusInscricao`, and the fixed labels `1º encontro` through `5º encontro`. It preserves the selected value from `currentFilters` when that value still exists.
- `renderKpis(summary)`: writes KPI cards into `#kpiGrid` for cursistas, turmas, municípios, educadores, períodos por cursista, períodos previstos total, presenças, faltas, dispensas, frequência geral, aptos, em acompanhamento, não aptos, percentual aptos, percentual em acompanhamento, and percentual não aptos.
- `renderRiskList(students)`: filters students whose `situacao` is `Não apto pelo critério de frequência` or whose `observacao` starts with `Risco alto`; sorts by `periodosValidos` ascending and `faltas` descending; renders the first 12 records into `#riskList`.
- `renderStudentTable(students)`: renders every filtered student into `#studentTable`, including nome, turma, município, educador, presenças, faltas, dispensas, períodos válidos, percentual de frequência, situação, and observação.
- `renderLoadState({ status, message, updatedAt })`: updates `#loadStatus` with status classes `is-loading`, `is-ok`, or `is-error`, and updates `#lastUpdated` with `Última atualização: dd/mm/aaaa hh:mm:ss` when `updatedAt` is present.
- `readFilters()`: returns `{ turma, municipio, educador, encontro, situacao, statusInscricao, busca }` from the filter controls.
- `bindFilterEvents(callback)`: attaches `change` listeners to selects, an `input` listener to `#filterBusca`, and a `click` listener to `#resetFilters` that restores all filters to `Todos` and clears the search field before calling `callback`.

Use small private helpers inside `src/render.js` named `formatNumber`, `formatPercent`, `escapeHtml`, `optionMarkup`, `badgeClassForStatus`, and `kpiCard`.

- [ ] **Step 2: Create `src/charts.js`**

Implement exported function `renderCharts(model)`. It must keep a module-level `charts` object, call `destroy()` on every existing chart before creating new ones, and render:

- `encounterChart`: stacked bar with presenças, faltas, dispensas and sem registro by encounter.
- `statusChart`: doughnut with aptos, em acompanhamento and não aptos.
- `turmaChart`: horizontal bar with top turmas by cursistas and color segments for status.
- `municipioChart`: horizontal bar with top municípios by cursistas and color segments for status.
- `educadorChart`: horizontal bar with educators by status.

- [ ] **Step 3: Create `src/main.js`**

```js
import { REFRESH_INTERVAL_MS } from './config.js';
import { fetchSheetRows } from './csv.js';
import { applyFilters, buildAttendanceModel } from './attendanceModel.js';
import {
  bindFilterEvents,
  populateFilters,
  readFilters,
  renderKpis,
  renderLoadState,
  renderRiskList,
  renderStudentTable
} from './render.js';
import { renderCharts } from './charts.js';

let baseModel = null;

function render() {
  if (!baseModel) return;
  const filteredModel = applyFilters(baseModel, readFilters());
  populateFilters(baseModel, readFilters());
  renderKpis(filteredModel.summary);
  renderRiskList(filteredModel.students);
  renderStudentTable(filteredModel.students);
  renderCharts(filteredModel);
}

async function loadData() {
  try {
    renderLoadState({ status: 'loading', message: 'Atualizando planilha...', updatedAt: null });
    const rows = await fetchSheetRows();
    baseModel = buildAttendanceModel(rows);
    populateFilters(baseModel, readFilters());
    render();
    renderLoadState({ status: 'ok', message: 'Planilha atualizada', updatedAt: new Date() });
  } catch (error) {
    console.error(error);
    renderLoadState({ status: 'error', message: error.message, updatedAt: null });
  }
}

bindFilterEvents(render);
loadData();
setInterval(loadData, REFRESH_INTERVAL_MS);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') loadData();
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render.js src/charts.js src/main.js
git commit -m "feat: renderiza filtros indicadores graficos e tabela"
```

## Task 7: README and deployment documentation

**Files:**
- Create or replace: `README.md`
- Modify: `INSTRUCOES_DEPLOY.md`

- [ ] **Step 1: Write `README.md`**

The README must include:

- Project purpose.
- Public Google Sheets CSV URL.
- How automatic refresh works.
- Exact calculation rules:
  - 10 presencial periods;
  - minimum 7 valid periods;
  - `PRESENTE`, `DISPENSADO`, `ATESTADO MÉDICO`, and automatic first-encounter dispensa count as valid;
  - `AUSENTE` does not count as valid;
  - later blank periods remain sem registro.
- Local run instructions:

```bash
npm test
npm run serve
```

- GitHub Pages publication instructions.
- Validation checklist.

- [ ] **Step 2: Update `INSTRUCOES_DEPLOY.md`**

Make it describe publishing this static dashboard via GitHub Pages from the repository root, including:

```text
Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main → Folder: / (root)
```

- [ ] **Step 3: Commit**

```bash
git add README.md INSTRUCOES_DEPLOY.md
git commit -m "docs: documenta regras fonte e publicacao do dashboard"
```

## Task 8: Full validation before handoff

**Files:**
- Modify only files needed to fix validation issues found in this task.

- [ ] **Step 1: Run automated tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Fetch the live CSV and confirm educator column**

Run:

```bash
curl --http1.1 -k -L --retry 3 "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoGnE2RG9yDysuCwJubfxoJcbbdC8yfeguHrKOXwxyiIGAKxy71hvp8Uow4-3gucHLQlBOqp24NdaU/pub?gid=1700106572&single=true&output=csv" | head -n 1
```

Expected: header includes `EDUCADOR(A)`.

- [ ] **Step 3: Start local server**

Run: `npm run serve`

Expected: local server starts at `http://localhost:8080`.

- [ ] **Step 4: Browser validation**

Open `http://localhost:8080` and verify:

- page loads without JavaScript console errors;
- status pill changes from loading to updated;
- KPI cards render with real Google Sheets data;
- filters update all sections;
- charts render;
- table renders individual calculations;
- layout is usable at desktop width;
- layout is usable near 390 px mobile width.

- [ ] **Step 5: Reconcile dashboard numbers with model output**

Run a small Node command that fetches the CSV, builds the model, and prints summary:

```bash
node --input-type=module -e "import { fetchSheetRows } from './src/csv.js'; import { buildAttendanceModel } from './src/attendanceModel.js'; const rows = await fetchSheetRows(); const model = buildAttendanceModel(rows); console.log(JSON.stringify(model.summary, null, 2));"
```

Expected: printed summary matches KPI cards on the unfiltered dashboard.

- [ ] **Step 6: Commit validation fixes if any**

If validation required fixes, commit them:

```bash
git add index.html style.css src README.md INSTRUCOES_DEPLOY.md tests package.json
git commit -m "fix: ajusta validacao final do dashboard"
```

If no fixes were needed, do not create an empty commit.

## Task 9: Publish to GitHub and hand off

**Files:**
- Modify: `README.md` only if the final GitHub Pages URL needs to be inserted after publication.

- [ ] **Step 1: Push branch**

Run:

```bash
git push -u origin codex/dashboard-presencas-certificacao
```

Expected: branch is pushed successfully.

- [ ] **Step 2: Merge or publish branch according to repository policy**

If direct update of `main` is appropriate for this repository, fast-forward or merge the branch into `main`, push `main`, and enable/confirm GitHub Pages from the root folder. If repository policy requires review, open a pull request and wait for merge before claiming the public dashboard is updated.

- [ ] **Step 3: Confirm public dashboard URL**

Expected GitHub Pages URL pattern:

```text
https://sobral90.github.io/nos-na-rede-dashboard/
```

Open the URL after publication and verify the new dashboard loads.

- [ ] **Step 4: Update README with final public link**

Add the final repository and dashboard links to `README.md`, then commit:

```bash
git add README.md
git commit -m "docs: adiciona link publico do dashboard"
git push
```

- [ ] **Step 5: Final handoff**

Report:

- files created or changed;
- calculation rules implemented;
- Google Sheets integration configuration;
- validation commands and browser checks performed;
- GitHub repository link;
- public dashboard link.

## Self-review

- Spec coverage: the plan covers the approved source URL, educator column, 10-period/7-valid rule, dispensa equivalence, automatic first-encounter dispensa, mandatory indicators, filters, visualizations, individual calculations, validation, README, GitHub, and GitHub Pages handoff.
- Placeholder scan: the plan contains no `TBD`, `TODO`, or omitted core calculation logic. UI helper internals are named explicitly in Task 6 and must be implemented before validation.
- Type consistency: shared constants come from `src/config.js`; normalization functions come from `src/text.js`; model functions are `buildAttendanceModel` and `applyFilters`; CSV functions are `parseCsv`, `normalizeRows`, and `fetchSheetRows`.

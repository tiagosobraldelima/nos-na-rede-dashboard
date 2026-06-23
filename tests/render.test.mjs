import test from 'node:test';
import assert from 'node:assert/strict';
import { CERTIFICATION_STATUS } from '../src/config.js';
import {
  populateFilters,
  readFilters,
  renderKpis,
  renderLoadState,
  renderRiskList,
  renderStudentTable
} from '../src/render.js';

class FakeClassList {
  constructor() {
    this.classes = new Set();
  }

  add(...classes) {
    classes.forEach((className) => this.classes.add(className));
  }

  remove(...classes) {
    classes.forEach((className) => this.classes.delete(className));
  }

  contains(className) {
    return this.classes.has(className);
  }
}

class FakeElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.listeners = {};
    this.classList = new FakeClassList();
  }

  addEventListener(event, callback) {
    this.listeners[event] = callback;
  }

  dispatch(event) {
    this.listeners[event]?.({ target: this });
  }
}

function setupDocument() {
  const elements = new Map();
  const ids = [
    'loadStatus',
    'lastUpdated',
    'filterTurma',
    'filterMunicipio',
    'filterEducador',
    'filterEncontro',
    'filterSituacao',
    'filterStatusInscricao',
    'filterBusca',
    'kpiGrid',
    'riskList',
    'studentTable',
    'resetFilters'
  ];

  ids.forEach((id) => elements.set(id, new FakeElement(id)));
  globalThis.document = {
    getElementById(id) {
      return elements.get(id) ?? null;
    }
  };

  return elements;
}

test('populateFilters preserves valid selections and readFilters returns the current state', () => {
  setupDocument();
  const model = {
    options: {
      turmas: ['Turma A', 'Turma B'],
      municipios: ['Maceió'],
      educadores: ['Educadora'],
      statusInscricao: ['INSCRITO']
    }
  };

  populateFilters(model, {
    turma: 'Turma B',
    municipio: 'Cidade removida',
    educador: 'Educadora',
    encontro: '3º encontro',
    situacao: CERTIFICATION_STATUS.naoApto,
    statusInscricao: 'INSCRITO',
    busca: 'ana'
  });

  assert.match(document.getElementById('filterTurma').innerHTML, /value="Todos"/);
  assert.match(document.getElementById('filterEncontro').innerHTML, /5º encontro/);
  assert.equal(document.getElementById('filterTurma').value, 'Turma B');
  assert.equal(document.getElementById('filterMunicipio').value, 'Todos');
  assert.deepEqual(readFilters(), {
    turma: 'Turma B',
    municipio: 'Todos',
    educador: 'Educadora',
    encontro: '3º encontro',
    situacao: CERTIFICATION_STATUS.naoApto,
    statusInscricao: 'INSCRITO',
    busca: 'ana'
  });
});

test('render helpers escape text and render empty states', () => {
  setupDocument();

  renderKpis({
    totalCursistas: 1,
    totalTurmas: 1,
    totalMunicipios: 1,
    totalEducadores: 1,
    periodosPorCursista: 10,
    periodosPrevistosTotal: 10,
    presencas: 7,
    faltas: 2,
    dispensas: 1,
    percentualGeralFrequencia: 80,
    aptos: 1,
    acompanhamento: 0,
    naoAptos: 0,
    percentualAptos: 100,
    percentualAcompanhamento: 0,
    percentualNaoAptos: 0
  });
  assert.match(document.getElementById('kpiGrid').innerHTML, /Cursistas/);
  assert.match(document.getElementById('kpiGrid').innerHTML, /80%/);

  renderRiskList([]);
  assert.match(document.getElementById('riskList').innerHTML, /Nenhum participante/);

  renderStudentTable([{
    nome: '<script>bad</script>',
    turma: 'Turma A',
    municipio: 'Maceió',
    educador: 'Educadora',
    presencas: 1,
    faltas: 2,
    dispensas: 3,
    periodosValidos: 4,
    percentualFrequencia: 40,
    situacao: CERTIFICATION_STATUS.acompanhamento,
    observacao: 'Risco alto: <b>atenção</b>'
  }]);
  assert.match(document.getElementById('studentTable').innerHTML, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.match(document.getElementById('studentTable').innerHTML, /&lt;b&gt;atenção&lt;\/b&gt;/);
});

test('renderLoadState updates status classes and last updated timestamp', () => {
  setupDocument();

  renderLoadState({
    status: 'ok',
    message: 'Dados atualizados',
    updatedAt: new Date('2026-06-23T12:34:56')
  });

  assert.equal(document.getElementById('lastUpdated').textContent, 'Dados atualizados • 23/06/2026 12:34:56');
  assert.equal(document.getElementById('loadStatus').classList.contains('is-ok'), true);
});

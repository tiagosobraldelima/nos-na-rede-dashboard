import { CERTIFICATION_STATUS } from './config.js';

const FILTER_IDS = {
  turma: 'filterTurma',
  municipio: 'filterMunicipio',
  educador: 'filterEducador',
  situacao: 'filterSituacao',
  statusInscricao: 'filterStatusInscricao',
  busca: 'filterBusca'
};

const TABLE_PAGE_SIZE_ID = 'tablePageSize';
const RISK_PAGE_SIZE_ID = 'riskPageSize';

function element(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
}

function formatPercent(value) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1
  }).format(Number(value) || 0)}%`;
}

function formatDateTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date).replace(',', '');
}

function setSelectOptions(id, options, selectedValue) {
  const select = element(id);
  if (!select) return;

  const values = ['Todos', ...options.filter(Boolean)];
  const selected = values.includes(selectedValue) ? selectedValue : 'Todos';
  select.innerHTML = values
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join('');
  select.value = selected;
}

function turmasForSelectedEducador(model, selectedEducador) {
  const allTurmas = model.options?.turmas ?? [];
  if (!selectedEducador || selectedEducador === 'Todos') return allTurmas;
  if (!Array.isArray(model.students) || model.students.length === 0) return allTurmas;

  const linkedTurmas = new Set(
    (model.students ?? [])
      .filter((student) => student.educador === selectedEducador)
      .map((student) => student.turma)
      .filter(Boolean)
  );

  return allTurmas.filter((turma) => linkedTurmas.has(turma));
}

export function populateFilters(model, currentFilters = {}) {
  setSelectOptions(FILTER_IDS.educador, model.options?.educadores ?? [], currentFilters.educador);
  setSelectOptions(
    FILTER_IDS.turma,
    turmasForSelectedEducador(model, currentFilters.educador),
    currentFilters.turma
  );
  setSelectOptions(FILTER_IDS.municipio, model.options?.municipios ?? [], currentFilters.municipio);
  setSelectOptions(
    FILTER_IDS.situacao,
    Object.values(CERTIFICATION_STATUS),
    currentFilters.situacao
  );
  setSelectOptions(
    FILTER_IDS.statusInscricao,
    model.options?.statusInscricao ?? [],
    currentFilters.statusInscricao
  );

  const busca = element(FILTER_IDS.busca);
  if (busca) busca.value = currentFilters.busca ?? '';
}

export function renderKpis(summary = {}) {
  const target = element('kpiGrid');
  if (!target) return;

  const cards = [
    ['Cursistas', summary.totalCursistas, 'fa-user-graduate', 'blue'],
    ['Turmas', summary.totalTurmas, 'fa-layer-group', 'cyan'],
    ['Municípios', summary.totalMunicipios, 'fa-map-location-dot', 'pink'],
    ['Educadores', summary.totalEducadores, 'fa-person-chalkboard', 'yellow'],
    ['Períodos por cursista', summary.periodosPorCursista, 'fa-clipboard-list', 'blue'],
    ['Períodos previstos total', summary.periodosPrevistosTotal, 'fa-calendar-check', 'cyan'],
    ['Presenças', summary.presencas, 'fa-user-check', 'green'],
    ['Faltas', summary.faltas, 'fa-user-xmark', 'red'],
    ['Dispensas', summary.dispensas, 'fa-hand-holding-heart', 'yellow'],
    ['Frequência geral', formatPercent(summary.percentualGeralFrequencia), 'fa-chart-simple', 'green'],
    ['Aptos', summary.aptos, 'fa-award', 'green'],
    ['Em acompanhamento', summary.acompanhamento, 'fa-hourglass-half', 'yellow'],
    ['Não aptos', summary.naoAptos, 'fa-triangle-exclamation', 'red'],
    ['Percentual aptos', formatPercent(summary.percentualAptos), 'fa-circle-half-stroke', 'green'],
    ['Percentual em acompanhamento', formatPercent(summary.percentualAcompanhamento), 'fa-gauge-high', 'yellow'],
    ['Percentual não aptos', formatPercent(summary.percentualNaoAptos), 'fa-gauge-simple-high', 'red']
  ];

  target.innerHTML = cards.map(([label, value, icon, color]) => `
    <article class="kpi-card">
      <span class="kpi-icon ${escapeHtml(color)}"><i class="fa-solid ${escapeHtml(icon)}"></i></span>
      <p>${escapeHtml(label)}</p>
      <strong>${typeof value === 'number' ? formatNumber(value) : escapeHtml(value)}</strong>
    </article>
  `).join('');
}

export function renderReportSummary(summary = {}) {
  const target = element('reportSummary');
  if (!target) return;

  const total = formatNumber(summary.totalCursistas);
  const turmas = formatNumber(summary.totalTurmas);
  const educadores = formatNumber(summary.totalEducadores);
  const frequencia = formatPercent(summary.percentualGeralFrequencia);
  const aptos = formatNumber(summary.aptos);
  const acompanhamento = formatNumber(summary.acompanhamento);
  const naoAptos = formatNumber(summary.naoAptos);
  const percentualAptos = formatPercent(summary.percentualAptos);
  const percentualNaoAptos = formatPercent(summary.percentualNaoAptos);

  target.innerHTML = `
    <article class="report-card">
      <span class="report-label">Recorte atual</span>
      <strong>${total} cursistas</strong>
      <p>${turmas} turmas acompanhadas por ${educadores} educador(es).</p>
    </article>
    <article class="report-card">
      <span class="report-label">Frequência geral</span>
      <strong>${frequencia}</strong>
      <p>Percentual calculado sobre os 10 períodos presenciais previstos por cursista.</p>
    </article>
    <article class="report-card">
      <span class="report-label">Certificação presencial</span>
      <strong>${aptos} aptos</strong>
      <p>${acompanhamento} em acompanhamento e ${naoAptos} não aptos (${percentualAptos} aptos; ${percentualNaoAptos} não aptos).</p>
    </article>
  `;
}

function readPageSize(id) {
  const value = element(id)?.value ?? '10';
  if (value === 'all') return 'all';
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export function readRiskPageSize() {
  return readPageSize(RISK_PAGE_SIZE_ID);
}

export function renderRiskList(students = [], pageSize = readRiskPageSize()) {
  const target = element('riskList');
  if (!target) return;

  const riskStudents = students
    .filter((student) => (
      student.situacao === CERTIFICATION_STATUS.naoApto
      || String(student.observacao ?? '').startsWith('Risco alto')
    ))
    .sort((a, b) => (
      (a.periodosValidos - b.periodosValidos)
      || (b.faltas - a.faltas)
      || String(a.nome).localeCompare(String(b.nome))
    ));

  if (riskStudents.length === 0) {
    target.innerHTML = '<tr><td colspan="7">Nenhum participante em risco nos filtros atuais.</td></tr>';
    const riskStatus = element('riskDisplayStatus');
    if (riskStatus) {
      riskStatus.textContent = 'Exibindo 0 de 0 participantes em atenção prioritária no recorte atual.';
    }
    return;
  }

  const visibleRiskStudents = pageSize === 'all'
    ? riskStudents
    : riskStudents.slice(0, pageSize);

  target.innerHTML = visibleRiskStudents.map((student) => `
    <tr>
      <td><strong>${escapeHtml(student.nome)}</strong></td>
      <td>${escapeHtml(student.turma)}</td>
      <td>${escapeHtml(student.municipio)}</td>
      <td>${escapeHtml(student.educador)}</td>
      <td class="numeric-cell">${formatNumber(student.periodosValidos)}</td>
      <td class="numeric-cell"><span class="count-pill count-pill-red">${formatNumber(student.faltas)}</span></td>
      <td><span class="observation-alert"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(student.observacao)}</span></td>
    </tr>
  `).join('');

  const riskStatus = element('riskDisplayStatus');
  if (riskStatus) {
    riskStatus.textContent = `Exibindo ${formatNumber(visibleRiskStudents.length)} de ${formatNumber(riskStudents.length)} participantes em atenção prioritária no recorte atual.`;
  }
}

export function readTablePageSize() {
  return readPageSize(TABLE_PAGE_SIZE_ID);
}

export function renderStudentTable(students = [], pageSize = readTablePageSize()) {
  const target = element('studentTable');
  if (!target) return;

  if (students.length === 0) {
    target.innerHTML = '<tr><td colspan="10">Nenhum participante encontrado para os filtros atuais.</td></tr>';
    const tableStatus = element('tableDisplayStatus');
    if (tableStatus) {
      tableStatus.textContent = 'Exibindo 0 de 0 participantes do recorte atual.';
    }
    return;
  }

  const statusPriority = {
    [CERTIFICATION_STATUS.naoApto]: 0,
    [CERTIFICATION_STATUS.acompanhamento]: 1,
    [CERTIFICATION_STATUS.apto]: 2
  };
  const sortedStudents = [...students].sort((a, b) => (
    (statusPriority[a.situacao] ?? 9) - (statusPriority[b.situacao] ?? 9)
    || a.periodosValidos - b.periodosValidos
    || b.faltas - a.faltas
    || String(a.nome).localeCompare(String(b.nome))
  ));

  const visibleStudents = pageSize === 'all'
    ? sortedStudents
    : sortedStudents.slice(0, pageSize);

  target.innerHTML = visibleStudents.map((student) => `
    <tr>
      <td>${escapeHtml(student.nome)}</td>
      <td>${escapeHtml(student.turma)}</td>
      <td>${escapeHtml(student.municipio)}</td>
      <td>${escapeHtml(student.educador)}</td>
      <td>${formatNumber(student.presencas)}</td>
      <td>${formatNumber(student.faltas)}</td>
      <td>${formatNumber(student.dispensas)}</td>
      <td>${formatNumber(student.periodosValidos)}</td>
      <td>${formatPercent(student.percentualFrequencia)}</td>
      <td><span class="status-badge ${statusClass(student.situacao)}"><i class="fa-solid ${statusIcon(student.situacao)}"></i>${escapeHtml(student.situacao)}</span></td>
    </tr>
  `).join('');

  const tableStatus = element('tableDisplayStatus');
  if (tableStatus) {
    tableStatus.textContent = `Exibindo ${formatNumber(visibleStudents.length)} de ${formatNumber(sortedStudents.length)} participantes do recorte atual.`;
  }
}

function statusClass(situacao) {
  if (situacao === CERTIFICATION_STATUS.apto) return 'status-ok';
  if (situacao === CERTIFICATION_STATUS.naoApto) return 'status-danger';
  return 'status-watch';
}

function statusIcon(situacao) {
  if (situacao === CERTIFICATION_STATUS.apto) return 'fa-circle-check';
  if (situacao === CERTIFICATION_STATUS.naoApto) return 'fa-triangle-exclamation';
  return 'fa-clock';
}

export function renderLoadState({ status, message, updatedAt } = {}) {
  const statusElement = element('loadStatus');
  const updatedElement = element('lastUpdated');
  const timestamp = formatDateTime(updatedAt);

  if (statusElement) {
    statusElement.classList.remove('is-loading', 'is-ok', 'is-error');
    if (status) statusElement.classList.add(`is-${status}`);
  }

  if (updatedElement) {
    updatedElement.textContent = [message, timestamp].filter(Boolean).join(' • ');
  }
}

export function readFilters() {
  return {
    turma: element(FILTER_IDS.turma)?.value || 'Todos',
    municipio: element(FILTER_IDS.municipio)?.value || 'Todos',
    educador: element(FILTER_IDS.educador)?.value || 'Todos',
    encontro: 'Todos',
    situacao: element(FILTER_IDS.situacao)?.value || 'Todos',
    statusInscricao: element(FILTER_IDS.statusInscricao)?.value || 'Todos',
    busca: element(FILTER_IDS.busca)?.value || ''
  };
}

export function bindFilterEvents(callback) {
  for (const id of Object.values(FILTER_IDS)) {
    const input = element(id);
    if (!input) continue;
    input.addEventListener(id === FILTER_IDS.busca ? 'input' : 'change', callback);
  }

  const resetButton = element('resetFilters');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      for (const [key, id] of Object.entries(FILTER_IDS)) {
        const input = element(id);
        if (!input) continue;
        input.value = key === 'busca' ? '' : 'Todos';
      }
      callback();
    });
  }

  const tablePageSize = element(TABLE_PAGE_SIZE_ID);
  if (tablePageSize) {
    tablePageSize.addEventListener('change', callback);
  }

  const riskPageSize = element(RISK_PAGE_SIZE_ID);
  if (riskPageSize) {
    riskPageSize.addEventListener('change', callback);
  }
}

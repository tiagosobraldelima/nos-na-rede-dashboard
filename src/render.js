import { CERTIFICATION_STATUS, TOTAL_ENCOUNTERS } from './config.js';

const FILTER_IDS = {
  turma: 'filterTurma',
  municipio: 'filterMunicipio',
  educador: 'filterEducador',
  encontro: 'filterEncontro',
  situacao: 'filterSituacao',
  statusInscricao: 'filterStatusInscricao',
  busca: 'filterBusca'
};

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

export function populateFilters(model, currentFilters = {}) {
  setSelectOptions(FILTER_IDS.turma, model.options?.turmas ?? [], currentFilters.turma);
  setSelectOptions(FILTER_IDS.municipio, model.options?.municipios ?? [], currentFilters.municipio);
  setSelectOptions(FILTER_IDS.educador, model.options?.educadores ?? [], currentFilters.educador);
  setSelectOptions(
    FILTER_IDS.encontro,
    Array.from({ length: TOTAL_ENCOUNTERS }, (_, index) => `${index + 1}º encontro`),
    currentFilters.encontro
  );
  setSelectOptions(FILTER_IDS.situacao, Object.values(CERTIFICATION_STATUS), currentFilters.situacao);
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
    ['Cursistas', summary.totalCursistas, 'fa-users', 'blue'],
    ['Turmas', summary.totalTurmas, 'fa-people-group', 'cyan'],
    ['Municípios', summary.totalMunicipios, 'fa-location-dot', 'pink'],
    ['Educadores', summary.totalEducadores, 'fa-chalkboard-user', 'yellow'],
    ['Períodos por cursista', summary.periodosPorCursista, 'fa-list-check', 'blue'],
    ['Períodos previstos total', summary.periodosPrevistosTotal, 'fa-calendar-days', 'cyan'],
    ['Presenças', summary.presencas, 'fa-circle-check', 'green'],
    ['Faltas', summary.faltas, 'fa-circle-xmark', 'red'],
    ['Dispensas', summary.dispensas, 'fa-notes-medical', 'yellow'],
    ['Frequência geral', formatPercent(summary.percentualGeralFrequencia), 'fa-chart-line', 'green'],
    ['Aptos', summary.aptos, 'fa-certificate', 'green'],
    ['Em acompanhamento', summary.acompanhamento, 'fa-clock', 'yellow'],
    ['Não aptos', summary.naoAptos, 'fa-triangle-exclamation', 'red'],
    ['Percentual aptos', formatPercent(summary.percentualAptos), 'fa-percent', 'green'],
    ['Percentual em acompanhamento', formatPercent(summary.percentualAcompanhamento), 'fa-percent', 'yellow'],
    ['Percentual não aptos', formatPercent(summary.percentualNaoAptos), 'fa-percent', 'red']
  ];

  target.innerHTML = cards.map(([label, value, icon, color]) => `
    <article class="kpi-card">
      <span class="kpi-icon ${escapeHtml(color)}"><i class="fa-solid ${escapeHtml(icon)}"></i></span>
      <p>${escapeHtml(label)}</p>
      <strong>${typeof value === 'number' ? formatNumber(value) : escapeHtml(value)}</strong>
    </article>
  `).join('');
}

export function renderRiskList(students = []) {
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
    ))
    .slice(0, 12);

  if (riskStudents.length === 0) {
    target.innerHTML = '<p class="empty-state">Nenhum participante em risco nos filtros atuais.</p>';
    return;
  }

  target.innerHTML = riskStudents.map((student) => `
    <article class="risk-item">
      <div>
        <strong>${escapeHtml(student.nome)}</strong>
        <p>${escapeHtml(student.turma)} • ${escapeHtml(student.municipio)} • ${escapeHtml(student.educador)}</p>
        <small>${escapeHtml(student.observacao)}</small>
      </div>
      <span class="badge badge-red">${formatNumber(student.periodosValidos)} válidos / ${formatNumber(student.faltas)} faltas</span>
    </article>
  `).join('');
}

export function renderStudentTable(students = []) {
  const target = element('studentTable');
  if (!target) return;

  if (students.length === 0) {
    target.innerHTML = '<tr><td colspan="11">Nenhum participante encontrado para os filtros atuais.</td></tr>';
    return;
  }

  target.innerHTML = students.map((student) => `
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
      <td>${escapeHtml(student.situacao)}</td>
      <td>${escapeHtml(student.observacao)}</td>
    </tr>
  `).join('');
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
    encontro: element(FILTER_IDS.encontro)?.value || 'Todos',
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
}

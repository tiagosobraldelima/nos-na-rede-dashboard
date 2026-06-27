import { CERTIFICATION_STATUS } from './config.js';

const FILTER_IDS = {
  turma: 'filterTurma',
  municipio: 'filterMunicipio',
  educador: 'filterEducador',
  genero: 'filterGenero',
  racaEtnia: 'filterRacaEtnia',
  vinculoProfissional: 'filterVinculoProfissional',
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
  return selected;
}

function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const STUDENT_SEARCH_KEY_CACHE = new WeakMap();

function getStudentSearchKey(student) {
  let key = STUDENT_SEARCH_KEY_CACHE.get(student);
  if (key === undefined) {
    key = normalizeSearch([
      student.nome,
      student.cpf,
      student.inscricao,
      student.turma,
      student.municipio,
      student.educador
    ].join(' '));
    STUDENT_SEARCH_KEY_CACHE.set(student, key);
  }
  return key;
}

function studentMatchesFilter(student, filters = {}, ignoredKey = '', buscaNormalized = '') {
  const checks = {
    turma: () => !filters.turma || filters.turma === 'Todos' || student.turma === filters.turma,
    municipio: () => !filters.municipio || filters.municipio === 'Todos' || student.municipio === filters.municipio,
    educador: () => !filters.educador || filters.educador === 'Todos' || student.educador === filters.educador,
    genero: () => !filters.genero || filters.genero === 'Todos' || student.perfil?.genero === filters.genero,
    racaEtnia: () => !filters.racaEtnia || filters.racaEtnia === 'Todos' || student.perfil?.racaEtnia === filters.racaEtnia,
    vinculoProfissional: () => (
      !filters.vinculoProfissional
      || filters.vinculoProfissional === 'Todos'
      || student.perfil?.vinculoProfissional === filters.vinculoProfissional
    ),
    situacao: () => !filters.situacao || filters.situacao === 'Todos' || student.situacao === filters.situacao,
    statusInscricao: () => (
      !filters.statusInscricao
      || filters.statusInscricao === 'Todos'
      || student.statusInscricao === filters.statusInscricao
    ),
    busca: () => !buscaNormalized || getStudentSearchKey(student).includes(buscaNormalized)
  };

  return Object.entries(checks).every(([key, check]) => key === ignoredKey || check());
}

function optionsFor(model, filters, ignoredKey, selector, buscaNormalized = '') {
  return [...new Set((model.students ?? [])
    .filter((student) => studentMatchesFilter(student, filters, ignoredKey, buscaNormalized))
    .map(selector)
    .filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}

export function populateFilters(model, currentFilters = {}) {
  const normalizedFilters = {
    turma: currentFilters.turma ?? 'Todos',
    municipio: currentFilters.municipio ?? 'Todos',
    educador: currentFilters.educador ?? 'Todos',
    genero: currentFilters.genero ?? 'Todos',
    racaEtnia: currentFilters.racaEtnia ?? 'Todos',
    vinculoProfissional: currentFilters.vinculoProfissional ?? 'Todos',
    situacao: currentFilters.situacao ?? 'Todos',
    statusInscricao: currentFilters.statusInscricao ?? 'Todos',
    busca: currentFilters.busca ?? ''
  };
  const buscaNormalized = normalizeSearch(normalizedFilters.busca);

  setSelectOptions(FILTER_IDS.turma, optionsFor(model, normalizedFilters, 'turma', (student) => student.turma, buscaNormalized), normalizedFilters.turma);
  setSelectOptions(FILTER_IDS.municipio, optionsFor(model, normalizedFilters, 'municipio', (student) => student.municipio, buscaNormalized), normalizedFilters.municipio);
  setSelectOptions(FILTER_IDS.educador, optionsFor(model, normalizedFilters, 'educador', (student) => student.educador, buscaNormalized), normalizedFilters.educador);
  setSelectOptions(FILTER_IDS.genero, optionsFor(model, normalizedFilters, 'genero', (student) => student.perfil?.genero, buscaNormalized), normalizedFilters.genero);
  setSelectOptions(FILTER_IDS.racaEtnia, optionsFor(model, normalizedFilters, 'racaEtnia', (student) => student.perfil?.racaEtnia, buscaNormalized), normalizedFilters.racaEtnia);
  setSelectOptions(
    FILTER_IDS.vinculoProfissional,
    optionsFor(model, normalizedFilters, 'vinculoProfissional', (student) => student.perfil?.vinculoProfissional, buscaNormalized),
    normalizedFilters.vinculoProfissional
  );
  setSelectOptions(
    FILTER_IDS.situacao,
    optionsFor(model, normalizedFilters, 'situacao', (student) => student.situacao, buscaNormalized),
    normalizedFilters.situacao
  );
  setSelectOptions(
    FILTER_IDS.statusInscricao,
    optionsFor(model, normalizedFilters, 'statusInscricao', (student) => student.statusInscricao, buscaNormalized),
    normalizedFilters.statusInscricao
  );

  const busca = element(FILTER_IDS.busca);
  if (busca) busca.value = normalizedFilters.busca;
}

export function renderKpis(summary = {}) {
  const target = element('kpiGrid');
  if (!target) return;

  const sections = [
    {
      title: '',
      icon: '',
      cards: [
        ['Total de Cursistas', summary.totalCursistas, 'Participantes no recorte', 'fa-user-graduate', 'pink'],
        ['Total de Presenças', summary.presencas, '', 'fa-user-check', 'cyan'],
        ['Total de Faltas', summary.faltas, '', 'fa-user-xmark', 'red'],
        ['Taxa de frequência', formatPercent(summary.percentualGeralFrequencia), '', 'fa-percent', 'yellow']
      ]
    },
    {
      title: 'Situação para certificação',
      icon: 'fa-certificate',
      cards: [
        ['Aptos a certificar', summary.aptosCertificacao ?? summary.aptos, '0 a 3 faltas contabilizadas', 'fa-circle-check', 'green', 'success'],
        ['Não podem mais faltar', summary.naoPodemMaisFaltar ?? 0, 'Críticos: 2 ou 3 faltas contabilizadas', 'fa-triangle-exclamation', 'yellow', 'warning'],
        ['Sem possibilidade', summary.naoAptos, 'Já perderam o direito ao certificado', 'fa-ban', 'red', 'danger']
      ]
    },
    {
      title: 'Cobertura e status',
      icon: 'fa-chart-pie',
      cards: [
        ['Municípios', summary.totalMunicipios, 'Abrangência territorial', 'fa-map-location-dot', 'blue'],
        ['Turmas', summary.totalTurmas, 'Turmas ativas no recorte', 'fa-layer-group', 'cyan'],
        ['Educadores(as)', summary.totalEducadores, 'Educadores no recorte', 'fa-person-chalkboard', 'green'],
        ['Desistentes', summary.desistentes ?? 0, `${formatPercent(summary.percentualDesistentes ?? 0)} do total`, 'fa-user-slash', 'muted']
      ]
    }
  ];

  target.innerHTML = sections.map((section) => `
    ${section.title ? `<h2 class="kpi-section-title"><i class="fa-solid ${escapeHtml(section.icon)}"></i>${escapeHtml(section.title)}</h2>` : ''}
    <div class="kpi-section">
      ${section.cards.map(([label, value, helper, icon, color, tone]) => `
        <article class="kpi-card ${tone ? `kpi-card-${escapeHtml(tone)}` : ''}">
          <div>
            <strong>${typeof value === 'number' ? formatNumber(value) : escapeHtml(value)}</strong>
            <p>${escapeHtml(label)}</p>
            ${helper ? `<small>${escapeHtml(helper)}</small>` : ''}
          </div>
          <span class="kpi-icon ${escapeHtml(color)}"><i class="fa-solid ${escapeHtml(icon)}"></i></span>
        </article>
      `).join('')}
    </div>
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

export function renderProfileAnalytics(profileAnalytics = {}, loadIssue = '') {
  const summaryTarget = element('profileSummary');
  const statusTarget = element('profileStatus');
  if (!summaryTarget) return;

  const coverage = profileAnalytics.coverage ?? {};
  const unavailable = loadIssue || profileAnalytics.available === false;

  if (statusTarget) {
    statusTarget.textContent = unavailable
      ? (loadIssue || 'Dados complementares indisponíveis no momento. A análise principal permanece ativa.')
      : `Proteção aplicada: grupos com menos de ${formatNumber(profileAnalytics.minGroupSize ?? 5)} cursistas foram agrupados.`;
    statusTarget.classList.remove('is-error');
    if (unavailable) statusTarget.classList.add('is-error');
  }

  const cards = [
    ['Perfis vinculados', coverage.matched ?? 0, `${formatPercent(coverage.percentMatched ?? 0)} da base de presenças`, 'fa-id-card-clip', 'cyan'],
    ['Sem perfil vinculado', coverage.unmatchedAttendance ?? 0, 'Na base de presenças', 'fa-link-slash', 'yellow'],
    ['Registros complementares', coverage.totalProfiles ?? 0, `${formatNumber(coverage.profileOnly ?? 0)} sem vínculo no recorte`, 'fa-table-list', 'blue'],
    ['Grupos protegidos', profileAnalytics.smallGroupsCollapsed ?? 0, 'Agrupados por privacidade', 'fa-shield-heart', 'pink']
  ];

  summaryTarget.innerHTML = cards.map(([label, value, helper, icon, color]) => `
    <article class="profile-card">
      <span class="profile-icon ${escapeHtml(color)}"><i class="fa-solid ${escapeHtml(icon)}"></i></span>
      <div>
        <strong>${formatNumber(value)}</strong>
        <p>${escapeHtml(label)}</p>
        <small>${escapeHtml(helper)}</small>
      </div>
    </article>
  `).join('');
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
      <td data-label="Nome"><strong>${escapeHtml(student.nome)}</strong></td>
      <td data-label="Turma">${escapeHtml(student.turma)}</td>
      <td data-label="Município">${escapeHtml(student.municipio)}</td>
      <td data-label="Educador(a)">${escapeHtml(student.educador)}</td>
      <td data-label="Válidos" class="numeric-cell">${formatNumber(student.periodosValidos)}</td>
      <td data-label="Faltas" class="numeric-cell"><span class="count-pill count-pill-red">${formatNumber(student.faltas)}</span></td>
      <td data-label="Observação"><span class="observation-alert"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(student.observacao)}</span></td>
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
      <td data-label="Nome">${escapeHtml(student.nome)}</td>
      <td data-label="Turma">${escapeHtml(student.turma)}</td>
      <td data-label="Município">${escapeHtml(student.municipio)}</td>
      <td data-label="Educador(a)">${escapeHtml(student.educador)}</td>
      <td data-label="Presenças">${formatNumber(student.presencas)}</td>
      <td data-label="Faltas"><span class="count-pill count-pill-red">${formatNumber(student.faltas)}</span></td>
      <td data-label="Dispensas">${formatNumber(student.dispensas)}</td>
      <td data-label="Válidos">${formatNumber(student.periodosValidos)}</td>
      <td data-label="% frequência">${formatPercent(student.percentualFrequencia)}</td>
      <td data-label="Situação"><span class="status-badge participant-status-badge ${statusClass(student.situacao)}"><i class="fa-solid ${statusIcon(student.situacao)}"></i>${escapeHtml(statusText(student))}</span></td>
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

function statusText(student) {
  if (student.situacao === CERTIFICATION_STATUS.naoApto && student.observacao) {
    return student.observacao;
  }
  return student.situacao;
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
    genero: element(FILTER_IDS.genero)?.value || 'Todos',
    racaEtnia: element(FILTER_IDS.racaEtnia)?.value || 'Todos',
    vinculoProfissional: element(FILTER_IDS.vinculoProfissional)?.value || 'Todos',
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

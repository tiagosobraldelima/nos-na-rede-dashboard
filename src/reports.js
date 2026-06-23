import { CERTIFICATION_STATUS } from './config.js';

const LOGO_PATH = 'assets/nos-na-rede-logo.png';
const PUBLIC_LOGO_URL = 'https://tiagosobraldelima.github.io/nos-na-rede-dashboard/assets/nos-na-rede-logo.png';
const REPORT_TITLE = 'Relatório — Atenção prioritária';
const CSV_SEPARATOR = ';';

function formatDateTime(value = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(value).replace(',', '');
}

function formatPercent(value) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1
  }).format(Number(value) || 0)}%`;
}

function safeText(value, fallback = 'Não informado') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function reportFilename(extension) {
  const date = new Date().toISOString().slice(0, 10);
  return `nos-na-rede-atencao-prioritaria-${date}.${extension}`;
}

export function getPriorityStudents(students = []) {
  return [...students]
    .filter((student) => (
      student.situacao === CERTIFICATION_STATUS.naoApto
      || String(student.observacao ?? '').startsWith('Risco alto')
    ))
    .sort((a, b) => (
      (a.periodosValidos - b.periodosValidos)
      || (b.faltas - a.faltas)
      || String(a.nome).localeCompare(String(b.nome), 'pt-BR')
    ));
}

function buildFilterDescription(filters = {}) {
  const entries = [
    ['Turma', filters.turma],
    ['Município', filters.municipio],
    ['Educador(a)', filters.educador],
    ['Encontro', filters.encontro],
    ['Situação', filters.situacao],
    ['Status de inscrição', filters.statusInscricao],
    ['Busca', filters.busca]
  ].filter(([, value]) => value && value !== 'Todos');

  if (entries.length === 0) return 'Todos os registros';
  return entries.map(([label, value]) => `${label}: ${value}`).join(' | ');
}

export function buildPriorityReportData(model = {}, filters = {}) {
  const students = model.students ?? [];
  const priorityStudents = getPriorityStudents(students);
  const turmaMap = new Map();

  for (const student of students) {
    const turma = safeText(student.turma);
    if (!turmaMap.has(turma)) {
      turmaMap.set(turma, {
        turma,
        totalCursistas: 0,
        naoAptos: 0,
        comChance: 0
      });
    }

    const item = turmaMap.get(turma);
    item.totalCursistas += 1;
    if (student.situacao === CERTIFICATION_STATUS.naoApto) item.naoAptos += 1;
    if (student.situacao === CERTIFICATION_STATUS.acompanhamento) item.comChance += 1;
  }

  const turmaSummary = [...turmaMap.values()]
    .map((item) => ({
      ...item,
      percentualNaoAptos: percent(item.naoAptos, item.totalCursistas),
      percentualComChance: percent(item.comChance, item.totalCursistas)
    }))
    .sort((a, b) => b.naoAptos - a.naoAptos || b.comChance - a.comChance || a.turma.localeCompare(b.turma, 'pt-BR'));

  return {
    title: REPORT_TITLE,
    generatedAt: new Date(),
    filtersDescription: buildFilterDescription(filters),
    logoPath: LOGO_PATH,
    logoUrl: PUBLIC_LOGO_URL,
    priorityRows: priorityStudents.map((student) => ({
      nome: safeText(student.nome),
      turma: safeText(student.turma),
      educador: safeText(student.educador)
    })),
    turmaSummary
  };
}

function csvCell(value) {
  const text = String(value ?? '');
  if (text.includes(CSV_SEPARATOR) || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function csvRow(values) {
  return values.map(csvCell).join(CSV_SEPARATOR);
}

export function buildPriorityReportCsv(data) {
  const rows = [
    csvRow(['Projeto Nós na Rede']),
    csvRow([data.title]),
    csvRow(['Logo do projeto', data.logoUrl]),
    csvRow(['Gerado em', formatDateTime(data.generatedAt)]),
    csvRow(['Filtros', data.filtersDescription]),
    '',
    csvRow(['Cursistas em atenção prioritária']),
    csvRow(['Nome do cursista', 'Turma', 'Educador(a)']),
    ...data.priorityRows.map((row) => csvRow([row.nome, row.turma, row.educador])),
    '',
    csvRow(['Resumo geral por turma']),
    csvRow([
      'Turma',
      'Total de cursistas',
      'Não aptos',
      '% não aptos',
      'Com chance de certificação',
      '% com chance de certificação'
    ]),
    ...data.turmaSummary.map((row) => csvRow([
      row.turma,
      row.totalCursistas,
      row.naoAptos,
      formatPercent(row.percentualNaoAptos),
      row.comChance,
      formatPercent(row.percentualComChance)
    ]))
  ];

  return `\uFEFF${rows.join('\n')}`;
}

function downloadBlob(content, type, filename) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function loadLogoDataUrl() {
  const response = await fetch(LOGO_PATH);
  if (!response.ok) throw new Error('Não foi possível carregar a logo do projeto.');
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function ensureJsPdf() {
  const jsPDF = globalThis.window?.jspdf?.jsPDF ?? globalThis.jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error('Biblioteca jsPDF indisponível para gerar o PDF.');
  }
  return jsPDF;
}

function ensureXlsx() {
  const XLSX = globalThis.window?.XLSX ?? globalThis.XLSX;
  if (!XLSX) {
    throw new Error('Biblioteca SheetJS indisponível para gerar o XLSX.');
  }
  return XLSX;
}

export function downloadPriorityCsv(model, filters) {
  const data = buildPriorityReportData(model, filters);
  downloadBlob(
    buildPriorityReportCsv(data),
    'text/csv;charset=utf-8',
    reportFilename('csv')
  );
}

export async function downloadPriorityPdf(model, filters) {
  const data = buildPriorityReportData(model, filters);
  const jsPDF = ensureJsPdf();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logoDataUrl = await loadLogoDataUrl().catch(() => null);

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 14, 10, 22, 22);
  }

  doc.setTextColor(23, 32, 51);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(data.title, 42, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Projeto Nós na Rede • Gerado em ${formatDateTime(data.generatedAt)}`, 42, 24);
  doc.text(`Filtros: ${data.filtersDescription}`, 42, 30);

  doc.autoTable({
    startY: 39,
    head: [['Nome do cursista', 'Turma', 'Educador(a)']],
    body: data.priorityRows.map((row) => [row.nome, row.turma, row.educador]),
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [47, 128, 193], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 251, 255] },
    margin: { left: 14, right: 14 }
  });

  const summaryStartY = Math.min((doc.lastAutoTable?.finalY ?? 39) + 10, 178);
  doc.autoTable({
    startY: summaryStartY,
    head: [[
      'Turma',
      'Total de cursistas',
      'Não aptos',
      '% não aptos',
      'Com chance',
      '% com chance'
    ]],
    body: data.turmaSummary.map((row) => [
      row.turma,
      row.totalCursistas,
      row.naoAptos,
      formatPercent(row.percentualNaoAptos),
      row.comChance,
      formatPercent(row.percentualComChance)
    ]),
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [233, 75, 60], textColor: 255 },
    alternateRowStyles: { fillColor: [255, 249, 232] },
    margin: { left: 14, right: 14 }
  });

  doc.save(reportFilename('pdf'));
}

export function downloadPriorityXlsx(model, filters) {
  const data = buildPriorityReportData(model, filters);
  const XLSX = ensureXlsx();
  const workbook = XLSX.utils.book_new();
  const prioritySheet = XLSX.utils.aoa_to_sheet([
    ['Projeto Nós na Rede'],
    [data.title],
    ['Logo do projeto', data.logoUrl],
    ['Gerado em', formatDateTime(data.generatedAt)],
    ['Filtros', data.filtersDescription],
    [],
    ['Nome do cursista', 'Turma', 'Educador(a)'],
    ...data.priorityRows.map((row) => [row.nome, row.turma, row.educador])
  ]);

  prioritySheet['!cols'] = [{ wch: 42 }, { wch: 34 }, { wch: 34 }];

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Projeto Nós na Rede'],
    ['Resumo geral por turma'],
    ['Logo do projeto', data.logoUrl],
    ['Gerado em', formatDateTime(data.generatedAt)],
    ['Filtros', data.filtersDescription],
    [],
    [
      'Turma',
      'Total de cursistas',
      'Não aptos',
      '% não aptos',
      'Com chance de certificação',
      '% com chance de certificação'
    ],
    ...data.turmaSummary.map((row) => [
      row.turma,
      row.totalCursistas,
      row.naoAptos,
      row.percentualNaoAptos / 100,
      row.comChance,
      row.percentualComChance / 100
    ])
  ]);

  summarySheet['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 26 }];

  XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Atenção prioritária');
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo por turma');
  XLSX.writeFile(workbook, reportFilename('xlsx'));
}

function setStatus(message, isError = false) {
  const target = document.getElementById('riskReportStatus');
  if (!target) return;
  target.textContent = message;
  target.classList.toggle('is-error', isError);
}

async function runDownload(getContext, downloadFn, label) {
  const { model, filters } = getContext();
  if (!model) {
    setStatus('Aguarde o carregamento dos dados antes de baixar o relatório.', true);
    return;
  }

  try {
    setStatus(`Gerando relatório ${label}...`);
    await downloadFn(model, filters);
    setStatus(`Relatório ${label} gerado com sucesso.`);
  } catch (error) {
    console.error(`Erro ao gerar relatório ${label}:`, error);
    setStatus(error?.message ?? `Não foi possível gerar o relatório ${label}.`, true);
  }
}

export function bindReportDownloads(getContext) {
  const handlers = [
    ['downloadRiskPdf', downloadPriorityPdf, 'PDF'],
    ['downloadRiskCsv', downloadPriorityCsv, 'CSV'],
    ['downloadRiskXlsx', downloadPriorityXlsx, 'XLSX']
  ];

  for (const [id, handler, label] of handlers) {
    const button = document.getElementById(id);
    if (!button) continue;
    button.addEventListener('click', () => runDownload(getContext, handler, label));
  }
}

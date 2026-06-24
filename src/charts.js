import { CERTIFICATION_STATUS, COLORS } from './config.js';

const charts = {};
const trendPlugin = {
  id: 'nosNaRedeCenterLabel',
  afterDraw(chart) {
    const text = chart.options?.plugins?.centerLabel?.text;
    if (!text) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    ctx.save();
    ctx.fillStyle = COLORS.ink;
    ctx.font = '700 18px Outfit, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, (chartArea.left + chartArea.right) / 2, (chartArea.top + chartArea.bottom) / 2);
    ctx.restore();
  }
};

function chartLibrary() {
  return globalThis.Chart ?? globalThis.window?.Chart;
}

function canvasContext(id) {
  const canvas = document.getElementById(id);
  if (!canvas) {
    console.warn(`Canvas #${id} não encontrado.`);
    return null;
  }

  return canvas.getContext?.('2d') ?? canvas;
}

function destroyCharts() {
  Object.values(charts).forEach((chart) => chart?.destroy?.());
  Object.keys(charts).forEach((key) => delete charts[key]);
}

function statusDatasets(items) {
  return [
    {
      label: 'Aptos',
      data: items.map((item) => item.aptos),
      backgroundColor: COLORS.green
    },
    {
      label: 'Em acompanhamento',
      data: items.map((item) => item.acompanhamento),
      backgroundColor: COLORS.yellow
    },
    {
      label: 'Não aptos',
      data: items.map((item) => item.naoAptos),
      backgroundColor: COLORS.red
    }
  ];
}

function trendDataset(items, selector, label = 'Tendência', axisId = 'yTrend') {
  return {
    type: 'line',
    label,
    data: items.map(selector),
    borderColor: COLORS.blue,
    backgroundColor: 'rgba(47, 128, 193, 0.1)',
    borderWidth: 3,
    pointRadius: 3,
    pointHoverRadius: 5,
    tension: 0.36,
    fill: false,
    yAxisID: axisId === 'yTrend' ? axisId : undefined,
    xAxisID: axisId === 'xTrend' ? axisId : undefined,
    order: 0
  };
}

function sharedChartOptions(extraOptions = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 450 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          color: COLORS.muted,
          font: { weight: 700 }
        }
      },
      tooltip: {
        backgroundColor: '#172033',
        padding: 10,
        titleFont: { weight: 800 },
        bodyFont: { weight: 600 }
      },
      ...(extraOptions.plugins ?? {})
    },
    scales: extraOptions.scales,
    ...Object.fromEntries(Object.entries(extraOptions).filter(([key]) => !['plugins', 'scales'].includes(key)))
  };
}

function renderHorizontalStatusChart(Chart, id, items) {
  const context = canvasContext(id);
  if (!context) return;

  charts[id] = new Chart(context, {
    type: 'bar',
    data: {
      labels: items.map((item) => item.nome),
      datasets: [
        ...statusDatasets(items).map((dataset) => ({ ...dataset, order: 1 })),
        trendDataset(items, (item) => item.frequenciaMedia ?? 0, 'Tendência de frequência', 'xTrend')
      ]
    },
    options: sharedChartOptions({
      indexAxis: 'y',
      scales: {
        x: { stacked: true, beginAtZero: true, grid: { color: 'rgba(23, 32, 51, 0.08)' } },
        y: { stacked: true, ticks: { color: COLORS.muted, font: { weight: 700 } }, grid: { display: false } },
        xTrend: {
          position: 'top',
          min: 0,
          max: 100,
          grid: { display: false },
          ticks: { callback: (value) => `${value}%`, color: COLORS.blue }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label(context) {
              if (context.dataset.xAxisID === 'xTrend') {
                return `${context.dataset.label}: ${context.parsed?.x ?? 0}%`;
              }
              if (context.dataset.yAxisID === 'yTrend') {
                return `${context.dataset.label}: ${context.parsed?.y ?? 0}`;
              }
              return `${context.dataset.label}: ${context.parsed?.x ?? context.parsed?.y ?? 0}`;
            }
          }
        }
      }
    })
  });
}

export function renderCharts(model) {
  const Chart = chartLibrary();
  destroyCharts();

  if (!Chart) {
    console.warn('Chart.js não está disponível; os gráficos não serão renderizados.');
    return;
  }
  Chart.register?.(trendPlugin);

  const statusContext = canvasContext('statusChart');
  if (statusContext) {
    charts.statusChart = new Chart(statusContext, {
      type: 'doughnut',
      data: {
        labels: [
          CERTIFICATION_STATUS.apto,
          CERTIFICATION_STATUS.acompanhamento,
          CERTIFICATION_STATUS.naoApto
        ],
        datasets: [{
          data: [
            model.summary?.aptos ?? 0,
            model.summary?.acompanhamento ?? 0,
            model.summary?.naoAptos ?? 0
          ],
          backgroundColor: [COLORS.green, COLORS.yellow, COLORS.red],
          borderColor: COLORS.card,
          borderWidth: 2
        }]
      },
      options: sharedChartOptions({
        plugins: {
          centerLabel: {
            text: `${model.summary?.totalCursistas ?? 0}`
          }
        }
      })
    });
  }

  const encounterContext = canvasContext('encounterChart');
  if (encounterContext) {
    const encounters = model.breakdowns?.byEncounter ?? [];
    charts.encounterChart = new Chart(encounterContext, {
      type: 'bar',
      data: {
        labels: encounters.map((item) => item.encontro),
        datasets: [
          { label: 'Presenças', data: encounters.map((item) => item.presencas), backgroundColor: COLORS.green, order: 1 },
          { label: 'Faltas', data: encounters.map((item) => item.faltas), backgroundColor: COLORS.red, order: 1 },
          { label: 'Dispensas', data: encounters.map((item) => item.dispensas), backgroundColor: COLORS.yellow, order: 1 },
          { label: 'Sem registro', data: encounters.map((item) => item.semRegistro), backgroundColor: COLORS.line, order: 1 },
          trendDataset(encounters, (item) => item.presencas, 'Linha de tendência')
        ]
      },
      options: sharedChartOptions({
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(23, 32, 51, 0.08)' } },
          yTrend: {
            position: 'right',
            beginAtZero: true,
            grid: { display: false },
            ticks: { color: COLORS.blue }
          }
        }
      })
    });
  }

  renderHorizontalStatusChart(Chart, 'turmaChart', model.breakdowns?.byTurma ?? []);
  renderHorizontalStatusChart(Chart, 'municipioChart', model.breakdowns?.byMunicipio ?? []);
  renderHorizontalStatusChart(Chart, 'educadorChart', model.breakdowns?.byEducador ?? []);
}

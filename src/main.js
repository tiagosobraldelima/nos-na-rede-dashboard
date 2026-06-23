import { REFRESH_INTERVAL_MS } from './config.js';
import { fetchSheetRows } from './csv.js';
import { applyFilters, buildAttendanceModel } from './attendanceModel.js';
import { renderCharts } from './charts.js';
import {
  bindFilterEvents,
  populateFilters,
  readFilters,
  renderKpis,
  renderLoadState,
  renderRiskList,
  renderStudentTable
} from './render.js';

let baseModel = null;
let isLoading = false;

function render() {
  if (!baseModel) return;

  const filteredModel = applyFilters(baseModel, readFilters());
  renderKpis(filteredModel.summary);
  renderRiskList(filteredModel.students);
  renderStudentTable(filteredModel.students);
  renderCharts(filteredModel);
}

async function loadData() {
  if (isLoading) return;
  isLoading = true;
  renderLoadState({ status: 'loading', message: 'Carregando dados da planilha...' });

  try {
    const rows = await fetchSheetRows();
    baseModel = buildAttendanceModel(rows);
    populateFilters(baseModel, readFilters());
    render();
    renderLoadState({
      status: 'ok',
      message: 'Dados atualizados',
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Erro ao carregar dados da planilha:', error);
    renderLoadState({
      status: 'error',
      message: error?.message ?? 'Não foi possível carregar os dados.'
    });
  } finally {
    isLoading = false;
  }
}

bindFilterEvents(render);
loadData();
setInterval(loadData, REFRESH_INTERVAL_MS);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    loadData();
  }
});

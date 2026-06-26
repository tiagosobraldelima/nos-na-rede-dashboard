import {
  CERTIFICATION_STATUS,
  PROFILE_PRIVACY_MIN_GROUP,
  TOTAL_PERIODS
} from './config.js';
import { normalizeValue, percent, titleCasePtBr } from './text.js';

const NOT_INFORMED = 'Não informado';
const PRIVACY_GROUP = 'Outros/agrupado por privacidade';

const DIMENSIONS = [
  { key: 'genero', label: 'Identidade de gênero' },
  { key: 'racaEtnia', label: 'Raça/etnia' },
  { key: 'vinculoProfissional', label: 'Vínculo profissional' },
  { key: 'formacao', label: 'Formação' },
  { key: 'pcd', label: 'PCD' },
  { key: 'regiaoSaude', label: 'Região de saúde' }
];

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizedKey(value) {
  return normalizeValue(value).replace(/\s+/g, ' ').trim();
}

function cleanCategory(value) {
  const raw = String(value ?? '').trim().replace(/\s+/g, ' ');
  const normalized = normalizeValue(raw);

  if (
    !normalized
    || ['NAO INFORMADO', 'NAO DECLARADO', 'NAO SE APLICA', 'N/A', 'NI', '-'].includes(normalized)
  ) {
    return NOT_INFORMED;
  }

  return titleCasePtBr(raw);
}

function normalizeGender(value) {
  const normalized = normalizeValue(value);
  if (!normalized || ['NAO INFORMADO', 'NAO DECLARADO'].includes(normalized)) return NOT_INFORMED;
  if (['F', 'FEM', 'FEMININO', 'MULHER', 'MULHER CIS', 'MULHER CISGENERO'].includes(normalized)) {
    return 'Mulher cisgênero';
  }
  if (['M', 'MASC', 'MASCULINO', 'HOMEM', 'HOMEM CIS', 'HOMEM CISGENERO'].includes(normalized)) {
    return 'Homem cisgênero';
  }
  return cleanCategory(value);
}

function normalizeRace(value) {
  const normalized = normalizeValue(value);
  if (!normalized || ['NAO INFORMADO', 'NAO DECLARADO'].includes(normalized)) return NOT_INFORMED;

  const map = {
    PARDA: 'Parda',
    PARDO: 'Parda',
    PRETA: 'Preta',
    PRETO: 'Preta',
    BRANCA: 'Branca',
    BRANCO: 'Branca',
    INDIGENA: 'Indígena',
    AMARELA: 'Amarela'
  };

  return map[normalized] ?? cleanCategory(value);
}

function normalizePcd(value) {
  const normalized = normalizeValue(value);
  if (!normalized || ['NAO INFORMADO', 'NAO DECLARADO'].includes(normalized)) return NOT_INFORMED;
  if (['SIM', 'S', 'PESSOA COM DEFICIENCIA', 'PCD'].includes(normalized)) return 'Sim';
  if (['NAO', 'N'].includes(normalized)) return 'Não';
  return cleanCategory(value);
}

function normalizeProfile(row, index) {
  return {
    profileId: `perfil-${index}`,
    cpf: onlyDigits(row.cpf),
    inscricao: normalizedKey(row.n_inscricao),
    nomeKey: normalizedKey(row.nome_completo || row.nome),
    turmaKey: normalizedKey(row.turma),
    municipioKey: normalizedKey(row.municipio),
    genero: normalizeGender(row.iden_genero || row.identidade_genero || row.genero),
    racaEtnia: normalizeRace(row.raca_etnia || row.raca || row.etnia),
    vinculoProfissional: cleanCategory(row.vinculo_profissional || row.vinculo || row.profissao),
    formacao: cleanCategory(row.nivel_de_formacao || row.formacao || row.escolaridade),
    pcd: normalizePcd(row.pcd || row.deficiencia),
    regiaoSaude: cleanCategory(row.regiao_de_saude),
    cargoFuncao: cleanCategory(row.cargo_funcao),
    instituicao: cleanCategory(row.nome_do_local_servico_de_atuacao)
  };
}

function uniqueIndex(profiles, selector) {
  const index = new Map();
  const duplicated = new Set();

  for (const profile of profiles) {
    const key = selector(profile);
    if (!key) continue;
    if (index.has(key)) {
      duplicated.add(key);
      index.delete(key);
    } else if (!duplicated.has(key)) {
      index.set(key, profile);
    }
  }

  return index;
}

function studentKeys(student) {
  return {
    cpf: onlyDigits(student.cpf),
    inscricao: normalizedKey(student.inscricao),
    composite: [
      student.nome,
      student.turma,
      student.municipio
    ].map(normalizedKey).join('::')
  };
}

function matchProfiles(students, profiles) {
  const byCpf = uniqueIndex(profiles, (profile) => profile.cpf);
  const byInscricao = uniqueIndex(profiles, (profile) => profile.inscricao);
  const byComposite = uniqueIndex(profiles, (profile) => [
    profile.nomeKey,
    profile.turmaKey,
    profile.municipioKey
  ].join('::'));
  const usedProfileIds = new Set();

  const matches = students.map((student) => {
    const keys = studentKeys(student);
    const profile = (
      (keys.cpf && byCpf.get(keys.cpf))
      || (keys.inscricao && byInscricao.get(keys.inscricao))
      || (keys.composite && byComposite.get(keys.composite))
      || null
    );

    if (profile) usedProfileIds.add(profile.profileId);
    return { student, profile };
  });

  return {
    matches,
    usedProfileIds
  };
}

function emptyGroup(label = '') {
  return {
    dimension: label,
    group: '',
    total: 0,
    validosSum: 0,
    faltasSum: 0,
    aptosCertificacao: 0,
    criticos: 0,
    naoAptos: 0
  };
}

function addStudentToGroup(group, student) {
  group.total += 1;
  group.validosSum += Number(student.periodosValidos) || 0;
  group.faltasSum += Number(student.faltas) || 0;
  if ((Number(student.faltas) || 0) <= 3) group.aptosCertificacao += 1;
  if (
    student.situacao === CERTIFICATION_STATUS.acompanhamento
    && [2, 3].includes(Number(student.faltas) || 0)
  ) {
    group.criticos += 1;
  }
  if (student.situacao === CERTIFICATION_STATUS.naoApto) group.naoAptos += 1;
}

function finalizeGroup(group) {
  return {
    dimension: group.dimension,
    group: group.group,
    total: group.total,
    frequenciaMedia: percent(group.validosSum, group.total * TOTAL_PERIODS),
    faltasMedia: Math.round((group.faltasSum / Math.max(group.total, 1)) * 10) / 10,
    aptosCertificacao: group.aptosCertificacao,
    percentualAptosCertificacao: percent(group.aptosCertificacao, group.total),
    criticos: group.criticos,
    percentualCriticos: percent(group.criticos, group.total),
    naoAptos: group.naoAptos,
    percentualNaoAptos: percent(group.naoAptos, group.total)
  };
}

function buildDimensionRows(matches, dimension) {
  const rawGroups = new Map();

  for (const { student, profile } of matches) {
    if (!profile) continue;
    const groupName = profile[dimension.key] || NOT_INFORMED;
    if (!rawGroups.has(groupName)) {
      rawGroups.set(groupName, {
        ...emptyGroup(dimension.label),
        group: groupName
      });
    }

    addStudentToGroup(rawGroups.get(groupName), student);
  }

  let collapsedCount = 0;
  const safeGroups = new Map();

  for (const group of rawGroups.values()) {
    const safeName = group.total < PROFILE_PRIVACY_MIN_GROUP ? PRIVACY_GROUP : group.group;
    if (safeName === PRIVACY_GROUP) collapsedCount += 1;
    if (!safeGroups.has(safeName)) {
      safeGroups.set(safeName, {
        ...emptyGroup(dimension.label),
        group: safeName
      });
    }

    const safeGroup = safeGroups.get(safeName);
    safeGroup.total += group.total;
    safeGroup.validosSum += group.validosSum;
    safeGroup.faltasSum += group.faltasSum;
    safeGroup.aptosCertificacao += group.aptosCertificacao;
    safeGroup.criticos += group.criticos;
    safeGroup.naoAptos += group.naoAptos;
  }

  const privacyGroup = safeGroups.get(PRIVACY_GROUP);
  if (privacyGroup && privacyGroup.total < PROFILE_PRIVACY_MIN_GROUP) {
    safeGroups.delete(PRIVACY_GROUP);
    if (!safeGroups.has(NOT_INFORMED)) {
      safeGroups.set(NOT_INFORMED, {
        ...emptyGroup(dimension.label),
        group: NOT_INFORMED
      });
    }

    const notInformedGroup = safeGroups.get(NOT_INFORMED);
    notInformedGroup.total += privacyGroup.total;
    notInformedGroup.validosSum += privacyGroup.validosSum;
    notInformedGroup.faltasSum += privacyGroup.faltasSum;
    notInformedGroup.aptosCertificacao += privacyGroup.aptosCertificacao;
    notInformedGroup.criticos += privacyGroup.criticos;
    notInformedGroup.naoAptos += privacyGroup.naoAptos;
  }

  return {
    rows: [...safeGroups.values()]
      .filter((group) => group.total >= PROFILE_PRIVACY_MIN_GROUP)
      .map(finalizeGroup)
      .sort((a, b) => b.total - a.total || a.group.localeCompare(b.group)),
    collapsedCount
  };
}

export function buildProfileAnalytics(students = [], profileRows = []) {
  const profiles = profileRows.map(normalizeProfile);
  const { matches, usedProfileIds } = matchProfiles(students, profiles);
  const matched = matches.filter(({ profile }) => Boolean(profile)).length;
  const totalAttendance = students.length;
  const unmatchedAttendance = Math.max(0, totalAttendance - matched);
  const profileOnly = Math.max(0, profiles.length - usedProfileIds.size);
  let smallGroupsCollapsed = 0;
  const rows = [];

  for (const dimension of DIMENSIONS) {
    const result = buildDimensionRows(matches, dimension);
    smallGroupsCollapsed += result.collapsedCount;
    rows.push(...result.rows);
  }

  return {
    available: profileRows.length > 0,
    minGroupSize: PROFILE_PRIVACY_MIN_GROUP,
    coverage: {
      totalAttendance,
      totalProfiles: profiles.length,
      matched,
      unmatchedAttendance,
      profileOnly,
      percentMatched: percent(matched, totalAttendance)
    },
    rows,
    smallGroupsCollapsed
  };
}

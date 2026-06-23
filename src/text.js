const ACCENT_MAP = {
  Á: 'A',
  À: 'A',
  Â: 'A',
  Ã: 'A',
  Ä: 'A',
  É: 'E',
  È: 'E',
  Ê: 'E',
  Ë: 'E',
  Í: 'I',
  Ì: 'I',
  Î: 'I',
  Ï: 'I',
  Ó: 'O',
  Ò: 'O',
  Ô: 'O',
  Õ: 'O',
  Ö: 'O',
  Ú: 'U',
  Ù: 'U',
  Û: 'U',
  Ü: 'U',
  Ç: 'C',
};

export function removeAccents(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ]/g, (char) => ACCENT_MAP[char] ?? char);
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
    .replace(/^_+|_+$/g, '');
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
        return word
          .split("'")
          .map((part, partIndex) => {
            if (partIndex === 0 && part.length === 1) return part;
            return part.charAt(0).toUpperCase() + part.slice(1);
          })
          .join("'");
      }

      return word
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-');
    })
    .join(' ');
}

export function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

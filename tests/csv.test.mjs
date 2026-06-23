import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeColumnName, normalizeValue, titleCasePtBr } from '../src/text.js';

test('normalizes column names with accents, spaces, punctuation and case', () => {
  assert.equal(normalizeColumnName(' EDUCADOR(A) '), 'educador_a');
  assert.equal(normalizeColumnName('Nº INSCRIÇÃO'), 'n_inscricao');
  assert.equal(normalizeColumnName('1º TURNO'), 'turno_1');
  assert.equal(normalizeColumnName('2º TURNO'), 'turno_2');
});

test('normalizes known spreadsheet column aliases explicitly', () => {
  assert.equal(normalizeColumnName('NÚM. INSCRIÇÃO'), 'n_inscricao');
  assert.equal(normalizeColumnName('N° INSCRIÇÃO'), 'n_inscricao');
  assert.equal(normalizeColumnName('1° TURNO'), 'turno_1');
  assert.equal(normalizeColumnName('1O TURNO'), 'turno_1');
  assert.equal(normalizeColumnName('2° TURNO'), 'turno_2');
  assert.equal(normalizeColumnName('2O TURNO'), 'turno_2');
});

test('does not collapse unknown inscription-like columns to known aliases', () => {
  assert.equal(normalizeColumnName('N9 INSCRIÇÃO'), 'n9_inscricao');
});

test('normalizes attendance values with accents and extra spaces', () => {
  assert.equal(normalizeValue('  atestado médico  '), 'ATESTADO MEDICO');
  assert.equal(normalizeValue('Dispensado'), 'DISPENSADO');
  assert.equal(normalizeValue(''), '');
});

test('formats Portuguese names while preserving connector words', () => {
  assert.equal(titleCasePtBr('SÃO JOSÉ DA TAPERA'), 'São José da Tapera');
  assert.equal(titleCasePtBr("OLHO D'ÁGUA DAS FLORES"), "Olho d'Água das Flores");
  assert.equal(titleCasePtBr('D’ÁVILA'), 'D’Ávila');
});

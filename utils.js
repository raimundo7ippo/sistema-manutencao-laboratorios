// utils.js
// Funções auxiliares genéricas, sem dependência de Firebase ou DOM específico.

/**
 * Escapa caracteres HTML para evitar XSS ao inserir dados dinâmicos via innerHTML.
 * SEMPRE use isso antes de colocar valor de usuário dentro de uma template string HTML.
 */
export function escapeHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Transforma um texto livre em algo seguro para usar como ID de documento no Firestore.
 * Remove acentos e qualquer caractere que não seja letra, número, hífen ou underscore.
 */
export function sanitizarParaId(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentuação
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Atrasa a execução de uma função até que pare de ser chamada por `delay` ms.
 * Usado para não disparar uma busca a cada tecla digitada.
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

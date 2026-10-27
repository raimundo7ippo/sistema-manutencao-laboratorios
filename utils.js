/**
 * Utilitários genéricos para o sistema da DTI.
 * Funções puras sem dependência de Firebase ou do DOM.
 */

/**
 * Escapa caracteres HTML para evitar ataques de XSS (Cross-Site Scripting).
 * Essencial ao renderizar dados dinâmicos da base de dados na interface.
 * 
 * @param {any} valor - O valor (texto, número, etc.) a ser escapado.
 * @returns {string} - Texto seguro para inserção direta no HTML.
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
 * Converte um texto livre num formato seguro e padronizado para ser usado como ID no Firestore.
 * Remove acentos, espaços e caracteres especiais indesejados.
 * 
 * @param {string} texto - Texto original (ex: "Informática, Bloco I")
 * @returns {string} - ID seguro (ex: "Informatica_Bloco_I")
 */
export function sanitizarParaId(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentuação
    .trim()
    .replace(/\s+/g, '_') // Substitui espaços por underscores
    .replace(/[^a-zA-Z0-9_-]/g, ''); // Remove tudo o que não for alfanumérico, hífen ou underscore
}

/**
 * Limita a taxa de execução de uma função.
 * Útil para campos de pesquisa (para não fazer um pedido à base de dados a cada letra digitada).
 * 
 * @param {Function} fn - Função original a ser executada.
 * @param {number} delay - Tempo de espera em milissegundos (padrão: 300ms).
 * @returns {Function} - Função com atraso aplicado.
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
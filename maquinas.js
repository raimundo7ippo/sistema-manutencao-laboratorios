import { db } from './firebase.js';
import {
  collection, getDocs, query, orderBy, serverTimestamp, doc, setDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { escapeHtml, sanitizarParaId } from './utils.js';

const COLECAO = "manutencoes";

// Recebe o idExistente (se for edição) para NÃO criar duplicados
export async function cadastrarMaquina(dados, idExistente = null) {
  // Limpa o prefixo caso haja lixo na base de dados antiga
  const identLimpa = String(dados.identificacao).replace(/PC-/gi, '').trim();

  // Se for edição, usa o ID exato do Firebase. Se for novo, gera um padronizado.
  const idUnico = idExistente || sanitizarParaId(`${dados.laboratorio}_PC-${identLimpa}`);
  
  const payload = {
    ...dados,
    identificacao: identLimpa, // Guarda apenas o número limpo
    status: dados.tudoFuncionando === "Não" ? "Pendente" : "OK",
  };

  // Regista a data de criação apenas se for uma máquina nova
  if (!idExistente) {
    payload.criadoEm = serverTimestamp();
  }

  await setDoc(doc(db, COLECAO, idUnico), payload, { merge: true });
}

export async function buscarMaquinas() {
  const q = query(collection(db, COLECAO), orderBy("criadoEm", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, dados: docSnap.data() }));
}

export async function concluirMaquina(idChamado) {
  await updateDoc(doc(db, COLECAO, idChamado), { status: "Concluído" });
}

export async function removerMaquina(idRegistro) {
  await deleteDoc(doc(db, COLECAO, idRegistro));
}

// Variáveis de controle globais para rastrear a coluna e a direção da ordenação
let colunaOrdenadaIndex = 0; // Começa ordenando pela primeira coluna (Máquina)
let direcaoOrdenacaoGeral = 'asc'; // 'asc' ou 'desc'

export function renderizarPainelMaquinas(tabela, cabecalho, registros, labFiltro, ocultarResolvidos) {
  if (!tabela || !cabecalho) return;

  // 1. --- DEFINE O MAPA DE COLUNAS DE ACORDO COM O LAB FILTRO ---
  // Isso nos ajuda a saber qual propriedade do objeto corresponde a qual coluna clicada
  let ths = '';
  if (labFiltro === "Informática, Bloco I") {
    ths = `<tr><th>Máquina</th><th>Património CPU</th><th>Internet?</th><th>Det. Internet</th><th>Bateria</th><th>Estabilizador?</th><th>Patr. Estab.</th><th>Det. Estab.</th><th>Tudo OK?</th><th>Motivo</th><th>Modelo</th><th>S.O.</th><th>Técnico</th><th>Ações</th></tr>`;
  } else if (labFiltro === "Programação Computacional") {
    ths = `<tr><th>Máquina</th><th>Património CPU</th><th>Internet?</th><th>Det. Internet</th><th>Win</th><th>Linux</th><th>Processador</th><th>RAM (Qtde)</th><th>RAM (Tipo)</th><th>Armaz. (Tipo)</th><th>Armaz. (GB)</th><th>Bateria (CMOS)</th><th>Estab.?</th><th>Det. Estab.</th><th>Tudo OK?</th><th>Motivo</th><th>Técnico</th><th>Ações</th></tr>`;
  } else if (labFiltro === "Simulações Numéricas") {
    ths = `<tr><th>Máquina</th><th>Património CPU</th><th>Internet?</th><th>Det. Internet</th><th>Bateria</th><th>Estabilizador?</th><th>Det. Estab.</th><th>Tudo OK?</th><th>Motivo</th><th>Win</th><th>Linux</th><th>Técnico</th><th>Ações</th></tr>`;
  }
  cabecalho.innerHTML = ths;

  // Adiciona estilo de cursor e indicadores visuais nos cabeçalhos gerados
  const cabeçalhosCélulas = cabecalho.querySelectorAll('th');
  cabeçalhosCélulas.forEach((th, index) => {
    // Não permite ordenar a coluna de "Ações" (geralmente a última)
    if (th.innerText.toLowerCase() === 'ações') return;

    th.style.cursor = 'pointer';
    th.style.userSelect = 'none';
    
    // Adiciona o indicador visual (seta) apenas na coluna atualmente ativa
    if (index === colunaOrdenadaIndex) {
      th.innerText += direcaoOrdenacaoGeral === 'asc' ? ' ▲' : ' ▼';
      th.style.backgroundColor = '#e9ecef';
    }

    // Atrela o evento de clique dinamicamente para cada título
    th.addEventListener('click', () => {
      if (colunaOrdenadaIndex === index) {
        // Se clicou na mesma coluna, inverte a direção
        direcaoOrdenacaoGeral = direcaoOrdenacaoGeral === 'asc' ? 'desc' : 'asc';
      } else {
        // Se clicou em uma nova coluna, muda o índice e reinicia em ordem crescente
        colunaOrdenadaIndex = index;
        direcaoOrdenacaoGeral = 'asc';
      }
      // Re-renderiza para aplicar a ordenação
      renderizarPainelMaquinas(tabela, cabecalho, registros, labFiltro, ocultarResolvidos);
    });
  });

  // 2. --- FILTRA OS REGISTROS DO LAB ATUAL ANTES DA ORDENAÇÃO ---
  // Precisamos filtrar primeiro para que o mapeamento dos elementos filhos funcione perfeitamente com os dados ordenados
  const registrosFiltrados = registros.filter(({ dados }) => dados.laboratorio === labFiltro);

  // 3. --- LÓGICA DE ORDENAÇÃO GENÉRICA DOS DADOS ---
  registrosFiltrados.sort((a, b) => {
    // Função auxiliar para extrair o valor que seria exibido na coluna com base no índice clicado
    const obterValorColuna = (item, indexColuna) => {
      const d = item.dados || {};
      
      // Normalização da identificação da Máquina ("PC-02")
      let ident = String(d.identificacao || '').replace(/PC-/gi, '').trim();
      if (/^\d+$/.test(ident) && ident.length === 1) ident = '0' + ident;
      const nomeMaquina = `PC-${ident}`;

      const statusGeral = d.tudoFuncionando === 'Sim' ? '✅ Sim' : '❌ Não';

      if (labFiltro === "Informática, Bloco I") {
        const colunas = [
          nomeMaquina, d.patrimonioCpu, d.internetFunciona, d.detalhesInternet, d.bateria,
          d.estabilizadorFunciona, d.patrimonioEstabilizador, d.detalhesEstabilizador,
          statusGeral, d.motivoProblema, d.modeloComputador, d.so, d.verificadoPor
        ];
        return String(colunas[indexColuna] || '').toLowerCase().trim();
      } else if (labFiltro === "Programação Computacional") {
        const colunas = [
          nomeMaquina, d.patrimonioCpu, d.internetFunciona, d.detalhesInternet, d.versaoWindows,
          d.versaoLinux, d.processador, d.ramQtde, d.ramTipo, d.armazenamentoTipo,
          d.armazenamentoQtde, d.bateria, d.estabilizadorFunciona, d.detalhesEstabilizador,
          statusGeral, d.motivoProblema, d.verificadoPor
        ];
        return String(colunas[indexColuna] || '').toLowerCase().trim();
      } else if (labFiltro === "Simulações Numéricas") {
        const colunas = [
          nomeMaquina, d.patrimonioCpu, d.internetFunciona, d.detalhesInternet, d.bateria,
          d.estabilizadorFunciona, d.detalhesEstabilizador, statusGeral, d.motivoProblema,
          d.versaoWindows, d.versaoLinux, d.verificadoPor
        ];
        return String(colunas[indexColuna] || '').toLowerCase().trim();
      }
      return '';
    };

    const valA = obterValorColuna(a, colunaOrdenadaIndex);
    const valB = obterValorColuna(b, colunaOrdenadaIndex);

    // Usa ordenação natural (funciona de forma inteligente para strings, números e emojis)
    if (direcaoOrdenacaoGeral === 'asc') {
      return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    } else {
      return valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
    }
  });

  // 4. --- MONTAGEM DAS LINHAS DA TABELA COM OS DADOS FILTRADOS E ORDENADOS ---
  let total = 0, ok = 0, erro = 0;
  const linhas = [];

  // Usamos o array já ordenado e filtrado para renderizar o conteúdo na tela
  for (const { id, dados } of registrosFiltrados) {
    total++;
    if (dados.tudoFuncionando === "Sim") ok++; else erro++;

    const concluido = dados.status === "Concluído";
    if (ocultarResolvidos && concluido) continue;

    const corBat = dados.bateria === 'Descarregada' ? 'background: #fff3cd; color: #856404; font-weight: bold; padding: 2px 6px; border-radius: 4px;' : '';
    const statusGeral = dados.tudoFuncionando === 'Sim' ? '✅ Sim' : '❌ Não';
    
    let identLimpa = String(dados.identificacao).replace(/PC-/gi, '').trim();
    if (/^\d+$/.test(identLimpa) && identLimpa.length === 1) {
      identLimpa = '0' + identLimpa;
    }
    const nomeMaquina = `PC-${escapeHtml(identLimpa) || '-'}`;

    let tds = '';
    if (labFiltro === "Informática, Bloco I") {
      tds = `
        <td><strong>🖥️ ${nomeMaquina}</strong></td>
        <td>${escapeHtml(dados.patrimonioCpu) || '-'}</td>
        <td>${escapeHtml(dados.internetFunciona) || '-'}</td>
        <td><small>${escapeHtml(dados.detalhesInternet) || '-'}</small></td>
        <td><span style="${corBat}">${escapeHtml(dados.bateria) || '-'}</span></td>
        <td>${escapeHtml(dados.estabilizadorFunciona) || '-'}</td>
        <td>${escapeHtml(dados.patrimonioEstabilizador) || '-'}</td>
        <td><small>${escapeHtml(dados.detalhesEstabilizador) || '-'}</small></td>
        <td style="color: ${dados.tudoFuncionando === 'Não' ? '#dc3545' : '#28a745'}; font-weight: bold;">${statusGeral}</td>
        <td><strong style="color: #d32f2f;">${escapeHtml(dados.motivoProblema) || '-'}</strong></td>
        <td><span style="background: #e9ecef; padding: 4px 8px; border-radius: 6px; font-size: 0.9em;">${escapeHtml(dados.modeloComputador) || '-'}</span></td>
        <td>${escapeHtml(dados.so) || '-'}</td>
      `;
    } else if (labFiltro === "Programação Computacional") {
      tds = `
        <td><strong>🖥️ ${nomeMaquina}</strong></td>
        <td>${escapeHtml(dados.patrimonioCpu) || '-'}</td>
        <td>${escapeHtml(dados.internetFunciona) || '-'}</td>
        <td><small>${escapeHtml(dados.detalhesInternet) || '-'}</small></td>
        <td>${escapeHtml(dados.versaoWindows) || '-'}</td>
        <td>${escapeHtml(dados.versaoLinux) || '-'}</td>
        <td><small>${escapeHtml(dados.processador) || '-'}</small></td>
        <td>${escapeHtml(dados.ramQtde) || '-'}</td>
        <td>${escapeHtml(dados.ramTipo) || '-'}</td>
        <td>${escapeHtml(dados.armazenamentoTipo) || '-'}</td>
        <td>${escapeHtml(dados.armazenamentoQtde) || '-'}</td>
        <td><span style="${corBat}">${escapeHtml(dados.bateria) || '-'}</span></td>
        <td>${escapeHtml(dados.estabilizadorFunciona) || '-'}</td>
        <td><small>${escapeHtml(dados.detalhesEstabilizador) || '-'}</small></td>
        <td style="color: ${dados.tudoFuncionando === 'Não' ? '#dc3545' : '#28a745'}; font-weight: bold;">${statusGeral}</td>
        <td><strong style="color: #d32f2f;">${escapeHtml(dados.motivoProblema) || '-'}</strong></td>
      `;
    } else if (labFiltro === "Simulações Numéricas") {
      tds = `
        <td><strong>🖥️ ${nomeMaquina}</strong></td>
        <td>${escapeHtml(dados.patrimonioCpu) || '-'}</td>
        <td>${escapeHtml(dados.internetFunciona) || '-'}</td>
        <td><small>${escapeHtml(dados.detalhesInternet) || '-'}</small></td>
        <td><span style="${corBat}">${escapeHtml(dados.bateria) || '-'}</span></td>
        <td>${escapeHtml(dados.estabilizadorFunciona) || '-'}</td>
        <td><small>${escapeHtml(dados.detalhesEstabilizador) || '-'}</small></td>
        <td style="color: ${dados.tudoFuncionando === 'Não' ? '#dc3545' : '#28a745'}; font-weight: bold;">${statusGeral}</td>
        <td><strong style="color: #d32f2f;">${escapeHtml(dados.motivoProblema) || '-'}</strong></td>
        <td>${escapeHtml(dados.versaoWindows) || '-'}</td>
        <td>${escapeHtml(dados.versaoLinux) || '-'}</td>
      `;
    }
    
// Botão de apagar removido das linhas. Mantido apenas o de Editar e Resolver.
    linhas.push(`
      <tr style="border-bottom: 1px solid #eee; background-color: ${concluido ? '#f8f9fa' : '#ffffff'}; opacity: ${concluido ? '0.65' : '1'};">
        ${tds}
        <td>👤 ${escapeHtml(dados.verificadoPor) || '-'}</td>
        <td><div style="display: flex; gap: 5px; flex-wrap: wrap;">
            ${concluido 
              ? '<span style="color: #155724; font-weight: bold; background: #d4edda; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">✔️ Resolvido</span>' 
              : `<button class="btn-concluir" data-id="${escapeHtml(id)}" style="background-color: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 0.85em;" title="Marcar como resolvido">✔️ Resolver</button>`}
            <button class="btn-editar" data-id="${escapeHtml(id)}" style="background-color: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 0.85em;" title="Editar dados da máquina">✏️ Editar</button>
          </div>
        </td>
      </tr>
    `);
        
    
          
}
  // --- ATUALIZAÇÃO DO FEED DE MÁQUINAS COM DEFEITO (LADO DIREITO) ---
  const containerFeedLista = document.getElementById('lista-feed-defeitos');
  if (containerFeedLista) {
    const maquinasComDefeito = registrosFiltrados.filter(({ dados }) => 
      dados.tudoFuncionando === "Não" && dados.status !== "Concluído"
    );

    if (maquinasComDefeito.length === 0) {
      containerFeedLista.innerHTML = `
        <div style="color: #28a745; text-align: center; padding: 20px; font-weight: bold; background: #e8f5e9; border-radius: 6px;">
          🎉 Tudo OK! Nenhuma máquina com pendências.
        </div>`;
    } else {
      const cardsFeed = maquinasComDefeito.map(({ dados }) => {
        let identLimpa = String(dados.identificacao).replace(/PC-/gi, '').trim();
        if (/^\d+$/.test(identLimpa) && identLimpa.length === 1) {
          identLimpa = '0' + identLimpa;
        }
        const nomeMaquina = `PC-${escapeHtml(identLimpa) || '-'}`;

        return `
          <div style="border-left: 4px solid #dc3545; background: #fff8f8; padding: 10px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.9em; text-align: left;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; color: #333; margin-bottom: 4px;">
              <span>🖥️ ${nomeMaquina}</span>
              <span style="color: #666; font-size: 0.85em; font-weight: normal;">📍 ${escapeHtml(dados.laboratorio)}</span>
            </div>
            <div style="color: #d32f2f; font-weight: 600; margin-bottom: 6px;">
              ❌ ${escapeHtml(dados.motivoProblema) || 'Defeito não especificado'}
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #777; border-top: 1px dashed #f5c6cb; padding-top: 4px;">
              <span>🔋 CMOS: ${escapeHtml(dados.bateria) || '-'}</span>
              <span>👤 Técnico: ${escapeHtml(dados.verificadoPor) || '-'}</span>
            </div>
          </div>
        `;
      });
      containerFeedLista.innerHTML = cardsFeed.join('');
    }
  }

const statTotal = document.getElementById('stat-total-pcs');
const statOk = document.getElementById('stat-pcs-ok');
const statErro = document.getElementById('stat-pcs-erro');

if(statTotal) statTotal.innerText = total;
if(statOk) statOk.innerText = ok;
if(statErro) statErro.innerText = erro;

tabela.innerHTML = linhas.length > 0 ? linhas.join('') : 'Nenhuma máquina registada neste laboratório até ao momento.';
}

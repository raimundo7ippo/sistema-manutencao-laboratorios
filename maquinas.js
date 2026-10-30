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

// Variável global para rastrear a direção da ordenação da Máquina ('asc' ou 'desc')
let direcaoOrdenacaoMaquina = 'asc';

export function renderizarPainelMaquinas(tabela, cabecalho, registros, labFiltro, ocultarResolvidos) {
  if (!tabela || !cabecalho) return;

  // 1. --- DEFINE O CABEÇALHO DE ACORDO COM O LAB FILTRO ---
  let ths = '';
  if (labFiltro === "Informática, Bloco I") {
    ths = `<tr><th>Máquina</th><th>Património CPU</th><th>Internet?</th><th>Det. Internet</th><th>Bateria</th><th>Estabilizador?</th><th>Patr. Estab.</th><th>Det. Estab.</th><th>Tudo OK?</th><th>Motivo</th><th>Modelo</th><th>S.O.</th><th>Técnico</th><th>Ações</th></tr>`;
  } else if (labFiltro === "Programação Computacional") {
    ths = `<tr><th>Máquina</th><th>Património CPU</th><th>Internet?</th><th>Det. Internet</th><th>Win</th><th>Linux</th><th>Processador</th><th>RAM (Qtde)</th><th>RAM (Tipo)</th><th>Armaz. (Tipo)</th><th>Armaz. (GB)</th><th>Bateria (CMOS)</th><th>Estab.?</th><th>Det. Estab.</th><th>Tudo OK?</th><th>Motivo</th><th>Técnico</th><th>Ações</th></tr>`;
  } else if (labFiltro === "Simulações Numéricas") {
    ths = `<tr><th>Máquina</th><th>Património CPU</th><th>Internet?</th><th>Det. Internet</th><th>Bateria</th><th>Estabilizador?</th><th>Det. Estab.</th><th>Tudo OK?</th><th>Motivo</th><th>Win</th><th>Linux</th><th>Técnico</th><th>Ações</th></tr>`;
  }
  cabecalho.innerHTML = ths;

  // Aplica ordenação e indicador VISUAL APENAS na primeira coluna (Máquina)
  const cabeçalhosCélulas = cabecalho.querySelectorAll('th');
  if (cabeçalhosCélulas.length > 0) {
    const thMaquina = cabeçalhosCélulas[0];
    thMaquina.style.cursor = 'pointer';
    thMaquina.style.userSelect = 'none';
    thMaquina.style.backgroundColor = '#e9ecef';
    thMaquina.innerText += direcaoOrdenacaoMaquina === 'asc' ? ' ▲' : ' ▼';

    thMaquina.addEventListener('click', () => {
      direcaoOrdenacaoMaquina = direcaoOrdenacaoMaquina === 'asc' ? 'desc' : 'asc';
      renderizarPainelMaquinas(tabela, cabecalho, registros, labFiltro, ocultarResolvidos);
    });
  }

  // 2. --- FILTRA OS REGISTROS DO LAB ATUAL ---
  const registrosFiltrados = registros.filter(({ dados }) => dados.laboratorio === labFiltro);

  // 3. --- LÓGICA DE ORDENAÇÃO EXCLUSIVA PELA MÁQUINA (ORDEM NUMÉRICA) ---
  registrosFiltrados.sort((a, b) => {
    const identA = String(a.dados?.identificacao || '').replace(/PC-/gi, '').trim();
    const identB = String(b.dados?.identificacao || '').replace(/PC-/gi, '').trim();

    const numA = parseInt(identA, 10);
    const numB = parseInt(identB, 10);

    let comparacao = 0;
    if (!isNaN(numA) && !isNaN(numB)) {
      comparacao = numA - numB;
    } else {
      comparacao = identA.localeCompare(identB, undefined, { numeric: true, sensitivity: 'base' });
    }

    return direcaoOrdenacaoMaquina === 'asc' ? comparacao : -comparacao;
  });

  // 4. --- MONTAGEM DAS LINHAS DA TABELA ---
  let total = 0, ok = 0, erro = 0;
  const linhas = [];

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

    linhas.push(`
      <tr style="border-bottom: 1px solid #eee; background-color: ${concluido ? '#f8f9fa' : '#ffffff'}; opacity: ${concluido ? '0.65' : '1'};">
        ${tds}
        <td>👤 ${escapeHtml(dados.verificadoPor) || '-'}</td>
        <td>
          <div style="display: flex; gap: 5px; flex-wrap: wrap;">
            ${concluido 
              ? '<span style="color: #155724; font-weight: bold; background: #d4edda; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">✔️ Resolvido</span>' 
              : `<button class="btn-concluir" data-id="${escapeHtml(id)}" style="background-color: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 0.85em;" title="Marcar como resolvido">✔️ Resolver</button>`}
            <button class="btn-editar" data-id="${escapeHtml(id)}" style="background-color: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 0.85em;" title="Editar dados da máquina">✏️ Editar</button>
          </div>
        </td>
      </tr>
    `);
        
          
}
  

  const statTotal = document.getElementById('stat-total-pcs');
  const statOk = document.getElementById('stat-pcs-ok');
  const statErro = document.getElementById('stat-pcs-erro');

  if (statTotal) statTotal.innerText = total;
  if (statOk) statOk.innerText = ok;
  if (statErro) statErro.innerText = erro;

  tabela.innerHTML = linhas.length > 0 
    ? linhas.join('') 
    : '<tr><td colspan="20" style="text-align: center; padding: 25px; color: #666; font-size: 1.1em;">Nenhuma máquina registada neste laboratório até ao momento.</td></tr>';
}
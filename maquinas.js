import { db } from './firebase.js';
import {
  collection, getDocs, query, orderBy, serverTimestamp, doc, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { escapeHtml, sanitizarParaId } from './utils.js';

const COLECAO = "maquinas";

// 1. DADOS (Criar, Atualizar e Buscar)
export async function cadastrarMaquina(dados) {
  const idUnico = sanitizarParaId(`${dados.laboratorio}_${dados.identificacao}`);
  await setDoc(doc(db, COLECAO, idUnico), {
    ...dados,
    status: dados.tudoFuncionando === "Não" ? "Pendente" : "OK",
    criadoEm: serverTimestamp(),
  }, { merge: true });
}

export async function buscarMaquinas() {
  const q = query(collection(db, COLECAO), orderBy("criadoEm", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, dados: docSnap.data() }));
}

export async function concluirMaquina(idChamado) {
  await updateDoc(doc(db, COLECAO, idChamado), { status: "Concluído" });
}

// 2. RENDERIZAÇÃO DA TABELA (Colunas Dinâmicas)
export function renderizarPainelMaquinas(tabela, cabecalho, registros, labFiltro, ocultarResolvidos) {
  if (!tabela || !cabecalho) return;

  let ths = '';
  // Cabeçalhos exatos baseados nas suas planilhas
  if (labFiltro === "Informática, Bloco I") {
    ths = `<tr><th>ID</th><th>Patrimônio CPU</th><th>Internet?</th><th>Det. Internet</th><th>Bateria</th><th>Estabilizador?</th><th>Patr. Estab.</th><th>Det. Estab.</th><th>Tudo OK?</th><th>Motivo</th><th>Modelo</th><th>S.O.</th><th>Verificador</th><th>Ações</th></tr>`;
  } else if (labFiltro === "Programação Computacional") {
    ths = `<tr><th>Nº</th><th>Patrimônio CPU</th><th>Internet?</th><th>Det. Internet</th><th>Win</th><th>Linux</th><th>Processador</th><th>RAM (Qtde)</th><th>RAM (Tipo)</th><th>Armaz. (Tipo)</th><th>Armaz. (GB)</th><th>Bateria CMOS</th><th>Estab.?</th><th>Det. Estab.</th><th>Tudo OK?</th><th>Motivo</th><th>Verificador</th><th>Ações</th></tr>`;
  } else if (labFiltro === "Simulações Numéricas") {
    ths = `<tr><th>ID</th><th>Patrimônio CPU</th><th>Internet?</th><th>Det. Internet</th><th>Bateria</th><th>Estabilizador?</th><th>Det. Estab.</th><th>Tudo OK?</th><th>Motivo</th><th>Win</th><th>Linux</th><th>Verificador</th><th>Ações</th></tr>`;
  }
  cabecalho.innerHTML = ths;

  let total = 0, ok = 0, erro = 0;
  const linhas = [];

  for (const { id, dados } of registros) {
    if (dados.laboratorio !== labFiltro) continue;

    total++;
    if (dados.tudoFuncionando === "Sim") ok++; else erro++;

    const concluido = dados.status === "Concluído";
    if (ocultarResolvidos && concluido) continue;

    const corBat = dados.bateria === 'Descarregada' ? 'background: #fff3cd; color: #856404; font-weight: bold; padding: 2px 6px; border-radius: 4px;' : '';
    const statusGeral = dados.tudoFuncionando === 'Sim' ? '✅ Sim' : '❌ Não';
    
    let tds = '';
    // Dados exatos baseados nas suas planilhas
    if (labFiltro === "Informática, Bloco I") {
      tds = `
        <td><strong>${escapeHtml(dados.identificacao) || '-'}</strong></td>
        <td>${escapeHtml(dados.patrimonioCpu) || '-'}</td>
        <td>${escapeHtml(dados.internetFunciona) || '-'}</td>
        <td><small>${escapeHtml(dados.detalhesInternet) || '-'}</small></td>
        <td><span style="${corBat}">${escapeHtml(dados.bateria) || '-'}</span></td>
        <td>${escapeHtml(dados.estabilizadorFunciona) || '-'}</td>
        <td>${escapeHtml(dados.patrimonioEstabilizador) || '-'}</td>
        <td><small>${escapeHtml(dados.detalhesEstabilizador) || '-'}</small></td>
        <td style="color: ${dados.tudoFuncionando === 'Não' ? 'red' : 'green'}; font-weight: bold;">${statusGeral}</td>
        <td><strong style="color: #d32f2f;">${escapeHtml(dados.motivoProblema) || '-'}</strong></td>
        <td><span style="background: #e0e0e0; padding: 2px 6px; border-radius: 6px;">${escapeHtml(dados.modeloComputador) || '-'}</span></td>
        <td>${escapeHtml(dados.so) || '-'}</td>
      `;
    } else if (labFiltro === "Programação Computacional") {
      tds = `
        <td><strong>${escapeHtml(dados.identificacao) || '-'}</strong></td>
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
        <td style="color: ${dados.tudoFuncionando === 'Não' ? 'red' : 'green'}; font-weight: bold;">${statusGeral}</td>
        <td><strong style="color: #d32f2f;">${escapeHtml(dados.motivoProblema) || '-'}</strong></td>
      `;
    } else if (labFiltro === "Simulações Numéricas") {
      tds = `
        <td><strong>${escapeHtml(dados.identificacao) || '-'}</strong></td>
        <td>${escapeHtml(dados.patrimonioCpu) || '-'}</td>
        <td>${escapeHtml(dados.internetFunciona) || '-'}</td>
        <td><small>${escapeHtml(dados.detalhesInternet) || '-'}</small></td>
        <td><span style="${corBat}">${escapeHtml(dados.bateria) || '-'}</span></td>
        <td>${escapeHtml(dados.estabilizadorFunciona) || '-'}</td>
        <td><small>${escapeHtml(dados.detalhesEstabilizador) || '-'}</small></td>
        <td style="color: ${dados.tudoFuncionando === 'Não' ? 'red' : 'green'}; font-weight: bold;">${statusGeral}</td>
        <td><strong style="color: #d32f2f;">${escapeHtml(dados.motivoProblema) || '-'}</strong></td>
        <td>${escapeHtml(dados.versaoWindows) || '-'}</td>
        <td>${escapeHtml(dados.versaoLinux) || '-'}</td>
      `;
    }

    linhas.push(`
      <tr style="border-bottom: 1px solid #eee; background-color: ${concluido ? '#f8f9fa' : 'transparent'}; opacity: ${concluido ? '0.6' : '1'};">
        ${tds}
        <td>👤 ${escapeHtml(dados.verificadoPor) || '-'}</td>
        <td>
          ${concluido 
            ? '<span style="color: green; font-weight: bold;">Resolvido</span>' 
            : `<button class="btn-concluir" data-id="${escapeHtml(id)}" style="background-color: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">✔️ Resolver</button>`}
        </td>
      </tr>
    `);
  }

  document.getElementById('stat-total-pcs').innerText = total;
  document.getElementById('stat-pcs-ok').innerText = ok;
  document.getElementById('stat-pcs-erro').innerText = erro;

  tabela.innerHTML = linhas.length > 0 ? linhas.join('') : '<tr><td colspan="20" style="text-align: center; padding: 20px;">Nenhuma máquina neste laboratório.</td></tr>';
}

// 3. RENDERIZAÇÃO DO HISTÓRICO
export function renderizarHistoricoMaquinas(tabela, registros) {
  if (!tabela) return;

  const linhas = [];
  for (const { dados } of registros) {
    if (dados.status !== "Concluído") continue;

    const dataHora = dados.criadoEm?.toDate ? dados.criadoEm.toDate().toLocaleString('pt-BR') : '-';

    linhas.push(`
      <tr>
        <td><strong>${escapeHtml(dados.laboratorio) || '-'}</strong></td>
        <td>${escapeHtml(dados.identificacao) || '-'}</td>
        <td><strong style="color: #d32f2f;">${escapeHtml(dados.motivoProblema) || '-'}</strong></td>
        <td>👤 ${escapeHtml(dados.verificadoPor) || '-'}</td>
        <td>${dataHora}</td>
        <td><span style="color: green; font-weight: bold;">✔️ Resolvido</span></td>
      </tr>
    `);
  }

  tabela.innerHTML = linhas.length > 0 ? linhas.join('') : '<tr><td colspan="6" style="text-align: center; padding: 15px;">Sem histórico de problemas resolvidos.</td></tr>';
}
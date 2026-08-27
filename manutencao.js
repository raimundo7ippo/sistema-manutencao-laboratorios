import { db, auth } from './firebase.js';
import {
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { escapeHtml, sanitizarParaId } from './utils.js';

const NOME_COLECAO_MANUTENCOES = "manutencoes";
const NOME_COLECAO_SOFTWARES = "softwares_laboratorio";

/* =========================================================================
 * SEÇÃO 1 — MANUTENÇÃO DE MÁQUINAS (dados)
 * ========================================================================= */

/**
 * Cadastra ou atualiza o registro de vistoria de uma máquina.
 * Usa Laboratório + Identificação como chave única (não duplica a máquina).
 */
export async function cadastrarManutencao(dadosFormulario) {
  const usuarioAtual = auth.currentUser;
  if (!usuarioAtual) throw new Error("Usuário não autenticado.");

  const idUnico = sanitizarParaId(`${dadosFormulario.laboratorio}_${dadosFormulario.identificacao}`);
  if (!idUnico) throw new Error("Laboratório e identificação da máquina são obrigatórios.");

  await setDoc(doc(db, NOME_COLECAO_MANUTENCOES, idUnico), {
    ...dadosFormulario,
    solicitanteEmail: usuarioAtual.email,
    solicitanteUid: usuarioAtual.uid,
    status: dadosFormulario.tudoFuncionando === "Não" ? "Pendente" : "OK",
    criadoEm: serverTimestamp(),
  }, { merge: true });

  return idUnico;
}

/**
 * Busca TODOS os registros de manutenção uma única vez no Firestore.
 * O resultado deve ser reaproveitado tanto para o painel quanto para o histórico,
 * evitando duas leituras da mesma coleção.
 */
export async function buscarManutencoes() {
  const q = query(collection(db, NOME_COLECAO_MANUTENCOES), orderBy("criadoEm", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, dados: docSnap.data() }));
}

/** Marca um chamado como resolvido. */
export async function concluirManutencao(idChamado) {
  await updateDoc(doc(db, NOME_COLECAO_MANUTENCOES, idChamado), { status: "Concluído" });
}

/** Apaga registros de manutenção. tipoFiltro: "todos" | "concluidos". */
export async function limparSecaoManutencoes(tipoFiltro = "todos") {
  const snapshot = await getDocs(collection(db, NOME_COLECAO_MANUTENCOES));

  if (snapshot.empty) {
    alert("Não há registros de manutenção para limpar.");
    return 0;
  }

  const confirmado = confirm("Tem certeza que deseja apagar os registros da seção de manutenções? Esta ação não pode ser desfeita.");
  if (!confirmado) return 0;

  const paraApagar = snapshot.docs.filter((docSnap) => {
    if (tipoFiltro === "concluidos") return docSnap.data().status === "Concluído";
    return true;
  });

  await Promise.all(paraApagar.map((docSnap) => deleteDoc(doc(db, NOME_COLECAO_MANUTENCOES, docSnap.id))));

  alert(`Sucesso! ${paraApagar.length} registro(s) removido(s).`);
  return paraApagar.length;
}

/* =========================================================================
 * SEÇÃO 2 — MANUTENÇÃO DE MÁQUINAS (renderização)
 * ========================================================================= */

/**
 * Renderiza a tabela do painel principal + os cards de estatísticas,
 * a partir de uma lista já carregada (ver buscarManutencoes).
 */
export function renderizarPainel(tabelaElemento, registros, labFiltro = "Todos", ocultarConcluidos = false) {
  if (!tabelaElemento) return;

  if (registros.length === 0) {
    tabelaElemento.innerHTML = '<tr><td colspan="15">Nenhum registro encontrado.</td></tr>';
    atualizarCardsPcs(0, 0, 0);
    return;
  }

  let totalPcs = 0;
  let pcsOk = 0;
  let pcsErro = 0;
  const linhasHtml = [];

  for (const { id, dados } of registros) {
    if (labFiltro !== "Todos" && dados.laboratorio !== labFiltro) continue;

    totalPcs++;
    if (dados.tudoFuncionando === "Sim") pcsOk++; else pcsErro++;

    const estaConcluido = dados.status === "Concluído";
    if (ocultarConcluidos && estaConcluido) continue;

    linhasHtml.push(`
      <tr>
        <td>${escapeHtml(dados.identificacao) || '-'}</td>
        <td>${escapeHtml(dados.patrimonioCpu) || '-'}</td>
        <td>${escapeHtml(dados.internetFunciona) || '-'}</td>
        <td>${escapeHtml(dados.detalhesInternet) || '-'}</td>
        <td>${escapeHtml(dados.bateria) || '-'}</td>
        <td>${escapeHtml(dados.estabilizadorFunciona) || '-'}</td>
        <td>${escapeHtml(dados.patrimonioEstabilizador) || '-'}</td>
        <td>${escapeHtml(dados.detalhesEstabilizador) || '-'}</td>
        <td style="color: ${dados.tudoFuncionando === 'Não' ? 'red' : 'green'}; font-weight: bold;">
          ${escapeHtml(dados.tudoFuncionando) || '-'}
        </td>
        <td>${escapeHtml(dados.motivoProblema) || '-'}</td>
        <td>${escapeHtml(dados.modeloComputador) || '-'}</td>
        <td>${escapeHtml(dados.so) || '-'}</td>
        <td>${escapeHtml(dados.verificadoPor) || '-'}</td>
        <td><strong>${escapeHtml(dados.status) || 'Pendente'}</strong></td>
        <td>
          ${estaConcluido
            ? '✅ Finalizado'
            : `<button class="btn-concluir" data-id="${escapeHtml(id)}">Resolver</button>`}
        </td>
      </tr>
    `);
  }

  atualizarCardsPcs(totalPcs, pcsOk, pcsErro);

  tabelaElemento.innerHTML = linhasHtml.length > 0
    ? linhasHtml.join('')
    : '<tr><td colspan="15">Nenhum registro encontrado para este filtro.</td></tr>';
}

function atualizarCardsPcs(total, ok, erro) {
  const elTotal = document.getElementById('stat-total-pcs');
  const elOk = document.getElementById('stat-pcs-ok');
  const elErro = document.getElementById('stat-pcs-erro');

  if (elTotal) elTotal.innerText = total;
  if (elOk) elOk.innerText = ok;
  if (elErro) elErro.innerText = erro;
}

/** Renderiza a tabela de histórico (apenas registros com status "Concluído"). */
export function renderizarHistorico(tabelaElemento, registros) {
  if (!tabelaElemento) return;

  const linhasHtml = [];

  for (const { dados } of registros) {
    if (dados.status !== "Concluído") continue;

    const dataFormatada = dados.criadoEm?.toDate
      ? dados.criadoEm.toDate().toLocaleString('pt-BR')
      : '-';

    linhasHtml.push(`
      <tr>
        <td>${escapeHtml(dados.laboratorio) || '-'}</td>
        <td>${escapeHtml(dados.identificacao) || '-'}</td>
        <td>${escapeHtml(dados.patrimonioCpu) || '-'}</td>
        <td>${escapeHtml(dados.motivoProblema) || '-'}</td>
        <td>${escapeHtml(dados.verificadoPor) || '-'}</td>
        <td>${dataFormatada}</td>
        <td><span style="color: green;"><strong>Resolvido</strong></span></td>
      </tr>
    `);
  }

  tabelaElemento.innerHTML = linhasHtml.length > 0
    ? linhasHtml.join('')
    : '<tr><td colspan="7">Nenhum histórico de chamados resolvidos.</td></tr>';
}

/* =========================================================================
 * SEÇÃO 3 — AUDITORIA DE SOFTWARES (dados)
 * ========================================================================= */

/** Registra/atualiza a checagem de um software numa máquina (sem duplicar). */
export async function cadastrarChecagemSoftware(dadosSoftware) {
  const usuarioAtual = auth.currentUser;
  if (!usuarioAtual) throw new Error("Usuário não autenticado.");

  const idUnico = sanitizarParaId(`${dadosSoftware.software}_${dadosSoftware.laboratorio}_${dadosSoftware.maquina}`);
  if (!idUnico) throw new Error("Software, laboratório e máquina são obrigatórios.");

  await setDoc(doc(db, NOME_COLECAO_SOFTWARES, idUnico), {
    ...dadosSoftware,
    cadastradoPor: usuarioAtual.email,
    criadoEm: serverTimestamp(),
  }, { merge: true });

  return idUnico;
}

/** Busca todos os registros de auditoria de software. */
export async function buscarSoftwares() {
  const q = query(collection(db, NOME_COLECAO_SOFTWARES), orderBy("criadoEm", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data());
}

/** Apaga todos os registros de auditoria de software. */
export async function limparSecaoSoftwares() {
  const snapshot = await getDocs(collection(db, NOME_COLECAO_SOFTWARES));

  if (snapshot.empty) {
    alert("Não há registros de softwares para limpar.");
    return 0;
  }

  const confirmado = confirm("Tem certeza que deseja apagar TODA a auditoria de softwares? Esta ação não pode ser desfeita.");
  if (!confirmado) return 0;

  await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(doc(db, NOME_COLECAO_SOFTWARES, docSnap.id))));

  alert(`Sucesso! ${snapshot.docs.length} registro(s) de software removido(s).`);
  return snapshot.docs.length;
}

/* =========================================================================
 * SEÇÃO 4 — AUDITORIA DE SOFTWARES (renderização)
 * ========================================================================= */

/** Agrupa e renderiza a tabela de auditoria de softwares, com filtro de busca opcional. */
export function renderizarAuditoriaSoftwares(tabelaElemento, registros, termoBusca = "") {
  if (!tabelaElemento) return;

  const elTotalSofts = document.getElementById('stat-total-softwares');
  const elOkSofts = document.getElementById('stat-softwares-ok');
  const elErroSofts = document.getElementById('stat-softwares-erro');

  if (registros.length === 0) {
    tabelaElemento.innerHTML = '<tr><td colspan="5">Nenhum software registrado até o momento.</td></tr>';
    if (elTotalSofts) elTotalSofts.innerText = '0';
    if (elOkSofts) elOkSofts.innerText = '0';
    if (elErroSofts) elErroSofts.innerText = '0';
    return;
  }

  const busca = termoBusca.toLowerCase();
  const grupos = {};

  for (const d of registros) {
    const nomeSoft = d.software || 'Não especificado';

    const bateuBusca =
      nomeSoft.toLowerCase().includes(busca) ||
      (d.maquina && d.maquina.toLowerCase().includes(busca)) ||
      (d.laboratorio && d.laboratorio.toLowerCase().includes(busca)) ||
      (d.curso && d.curso.toLowerCase().includes(busca)) ||
      (d.solicitante && d.solicitante.toLowerCase().includes(busca));

    if (termoBusca && !bateuBusca) continue;

    if (!grupos[nomeSoft]) {
      grupos[nomeSoft] = {
        total: 0,
        ok: 0,
        erro: 0,
        ultimoteste: d.criadoEm?.toDate ? d.criadoEm.toDate().toLocaleString('pt-BR') : '-',
        itens: [],
      };
    }

    grupos[nomeSoft].total++;
    if (d.funciona === "Sim") grupos[nomeSoft].ok++; else grupos[nomeSoft].erro++;
    grupos[nomeSoft].itens.push(d);
  }

  const chavesSoftwares = Object.keys(grupos);

  if (chavesSoftwares.length === 0) {
    tabelaElemento.innerHTML = '<tr><td colspan="5">Nenhum resultado para a busca.</td></tr>';
    return;
  }

  let countOk = 0;
  let countErro = 0;
  const blocosHtml = [];

  chavesSoftwares.forEach((nomeSoft, index) => {
    const g = grupos[nomeSoft];
    const temErro = g.erro > 0;
    if (temErro) countErro++; else countOk++;

    const statusBadge = temErro
      ? `<span style="color: red; font-weight: bold;">⚠️ ${g.erro} máq. com falha (${g.ok}/${g.total} OK)</span>`
      : `<span style="color: green; font-weight: bold;">✅ 100% Funcional (${g.ok}/${g.total} OK)</span>`;

    blocosHtml.push(`
      <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : '#ffffff'}; font-weight: bold;">
        <td>💻 ${escapeHtml(nomeSoft)}</td>
        <td>${g.total} máquina(s)</td>
        <td>${statusBadge}</td>
        <td>${g.ultimoteste}</td>
        <td>
          <button class="btn-detalhes-soft" data-target="detalhe-soft-${index}" style="cursor: pointer; padding: 4px 8px;">
            👁️ Ver Detalhes
          </button>
        </td>
      </tr>
      <tr id="detalhe-soft-${index}" class="linha-detalhe-software" style="display: none; background-color: #f0f7f7;">
        <td colspan="5">
          <div style="padding: 10px; border-left: 3px solid #008080;">
            <small><strong>Histórico Individual de Instalações:</strong></small>
            <table border="1" style="width: 100%; margin-top: 5px; font-weight: normal; font-size: 0.9em; background: #fff;">
              ${g.itens.map((item) => `
                <tr>
                  <td>Lab: <strong>${escapeHtml(item.laboratorio) || '-'}</strong></td>
                  <td>Máquina: <strong>${escapeHtml(item.maquina) || '-'}</strong></td>
                  <td>Prof/Solicitante: ${escapeHtml(item.solicitante) || '-'}</td>
                  <td>Curso: ${escapeHtml(item.curso) || '-'}</td>
                  <td style="color: ${item.funciona === 'Sim' ? 'green' : 'red'}; font-weight: bold;">
                    Funciona: ${escapeHtml(item.funciona) || '-'}
                  </td>
                  <td>Auditado por: ${escapeHtml(item.cadastradoPor) || '-'}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        </td>
      </tr>
    `);
  });

  tabelaElemento.innerHTML = blocosHtml.join('');

  if (elTotalSofts) elTotalSofts.innerText = chavesSoftwares.length;
  if (elOkSofts) elOkSofts.innerText = countOk;
  if (elErroSofts) elErroSofts.innerText = countErro;
}

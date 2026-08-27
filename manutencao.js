import { db, auth } from './firebase-config.js';
import { 
  collection, 
  doc,
  setDoc,
  addDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Registra ou atualiza chamado de manutenção
export async function cadastrarManutencao(dados) {
  const statusAtual = dados.tudoFuncionando === "Sim" ? "Pendente/OK" : "Em Aberto";

  // ID Único composto: Lab + ID Máquina
  const docId = `${dados.laboratorio}_${dados.identificacao}`.replace(/[\/\s]/g, '_');

  await setDoc(doc(db, "manutencoes", docId), {
    ...dados,
    status: statusAtual,
    dataAtualizacao: serverTimestamp()
  }, { merge: true });
}

// Lista os chamados na tabela principal
export async function listarManutencoes(tabelaEl, labFiltro = "Todos", ocultarResolvidos = false) {
  if (!tabelaEl) return;

  try {
    let q = collection(db, "manutencoes");
    const snapshot = await getDocs(q);
    
    tabelaEl.innerHTML = "";
    let encontrou = false;

    snapshot.forEach(docSnap => {
      const d = docSnap.data();

      if (labFiltro !== "Todos" && d.laboratorio !== labFiltro) return;
      if (ocultarResolvidos && d.status === "Resolvido") return;

      encontrou = true;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.identificacao || '-'}</td>
        <td>${d.patrimonioCpu || '-'}</td>
        <td>${d.internetFunciona || '-'}</td>
        <td>${d.detalhesInternet || '-'}</td>
        <td>${d.bateria || '-'}</td>
        <td>${d.estabilizadorFunciona || '-'}</td>
        <td>${d.patrimonioEstabilizador || '-'}</td>
        <td>${d.detalhesEstabilizador || '-'}</td>
        <td>${d.tudoFuncionando || '-'}</td>
        <td>${d.motivoProblema || '-'}</td>
        <td>${d.modeloComputador || '-'}</td>
        <td>${d.so || '-'}</td>
        <td>${d.verificadoPor || '-'}</td>
        <td><strong>${d.status || 'Em Aberto'}</strong></td>
        <td>
          ${d.status !== 'Resolvido' 
            ? `<button class="btn-concluir" data-id="${docSnap.id}">Concluir</button>` 
            : '✓ Concluído'}
        </td>
      `;
      tabelaEl.appendChild(tr);
    });

    if (!encontrou) {
      tabelaEl.innerHTML = `<tr><td colspan="15">Nenhum registro encontrado.</td></tr>`;
    }
  } catch (err) {
    console.error("Erro ao listar manutenções:", err);
    tabelaEl.innerHTML = `<tr><td colspan="15">Erro ao carregar dados.</td></tr>`;
  }
}

// Conclui chamado e envia para o histórico
export async function concluirManutencao(idDoc) {
  const docRef = doc(db, "manutencoes", idDoc);
  await updateDoc(docRef, { status: "Resolvido" });

  await addDoc(collection(db, "historico_manutencoes"), {
    manutencaoId: idDoc,
    dataConclusao: serverTimestamp()
  });
}

// Lista o histórico de chamados resolvidos
export async function listarHistorico(tabelaEl) {
  if (!tabelaEl) return;

  try {
    const q = query(collection(db, "manutencoes"), where("status", "==", "Resolvido"));
    const snapshot = await getDocs(q);

    tabelaEl.innerHTML = "";
    let encontrou = false;

    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      encontrou = true;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.laboratorio || '-'}</td>
        <td>${d.identificacao || '-'}</td>
        <td>${d.patrimonioCpu || '-'}</td>
        <td>${d.motivoProblema || 'Nenhum'}</td>
        <td>${d.verificadoPor || '-'}</td>
        <td>${d.dataAtualizacao ? new Date(d.dataAtualizacao.toDate()).toLocaleString('pt-BR') : '-'}</td>
        <td><span style="color: green; font-weight: bold;">Resolvido</span></td>
      `;
      tabelaEl.appendChild(tr);
    });

    if (!encontrou) {
      tabelaEl.innerHTML = `<tr><td colspan="7">Nenhum histórico disponível.</td></tr>`;
    }
  } catch (err) {
    console.error("Erro ao listar histórico:", err);
  }
}

// Cadastra ou atualiza auditoria de software evitando duplicatas da mesma máquina
export async function cadastrarChecagemSoftware(dados) {
  const user = auth.currentUser;
  const emailAudit = user ? user.email : (dados.auditadoPor || "Anônimo");

  // Chave Única: Software + Lab + Maquina
  const docId = `${dados.software}_${dados.laboratorio}_${dados.maquina}`.replace(/[\/\s]/g, '_');

  await setDoc(doc(db, "softwares_laboratorio", docId), {
    ...dados,
    auditadoPor: emailAudit,
    dataAuditoria: serverTimestamp()
  }, { merge: true });
}

// Lista auditoria agrupada por software com coluna de laboratório no detalhe
export async function listarAuditoriaSoftwares(tabelaEl, termoBusca = "") {
  if (!tabelaEl) return;

  try {
    const snapshot = await getDocs(collection(db, "softwares_laboratorio"));
    const softwaresAgrupados = {};

    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      const softNome = d.software;
      if (!softNome) return;

      if (!softwaresAgrupados[softNome]) {
        softwaresAgrupados[softNome] = [];
      }
      softwaresAgrupados[softNome].push({ id: docSnap.id, ...d });
    });

    tabelaEl.innerHTML = "";
    let totalMonitorados = 0;
    let totalOperacionais = 0;
    let totalComErro = 0;

    const termo = termoBusca.toLowerCase().trim();

    Object.keys(softwaresAgrupados).forEach((nomeSoft, index) => {
      const lista = softwaresAgrupados[nomeSoft];

      // Aplica o filtro nos detalhes
      const listaFiltrada = lista.filter(item => {
        if (!termo) return true;
        return (
          item.software?.toLowerCase().includes(termo) ||
          item.maquina?.toLowerCase().includes(termo) ||
          item.laboratorio?.toLowerCase().includes(termo) ||
          item.curso?.toLowerCase().includes(termo) ||
          item.solicitante?.toLowerCase().includes(termo)
        );
      });

      if (listaFiltrada.length === 0) return;

      totalMonitorados++;
      const maquinasComFalha = listaFiltrada.filter(i => i.funciona === "Não").length;
      const totalMaquinas = listaFiltrada.length;

      let statusHTML = "";
      if (maquinasComFalha === 0) {
        totalOperacionais++;
        statusHTML = `<span style="color: green; font-weight: bold;">🟢 100% Funcional (${totalMaquinas}/${totalMaquinas} OK)</span>`;
      } else {
        totalComErro++;
        statusHTML = `<span style="color: red; font-weight: bold;">⚠️ ${maquinasComFalha} máq. com falha (${totalMaquinas - maquinasComFalha}/${totalMaquinas} OK)</span>`;
      }

      // Pega a última data de auditoria do grupo
      const datas = listaFiltrada
        .map(i => i.dataAuditoria?.toDate ? i.dataAuditoria.toDate() : null)
        .filter(Boolean);
      const ultimaData = datas.length > 0 ? new Date(Math.max(...datas)).toLocaleString('pt-BR') : '-';

      const targetId = `detalhe-soft-${index}`;

      const trPrincipal = document.createElement('tr');
      trPrincipal.innerHTML = `
        <td><strong>💻 ${nomeSoft}</strong></td>
        <td>${totalMaquinas} máquina(s)</td>
        <td>${statusHTML}</td>
        <td>${ultimaData}</td>
        <td>
          <button class="btn-detalhes-soft" data-target="${targetId}" style="cursor: pointer;">👁️ Ver Detalhes</button>
        </td>
      `;
      tabelaEl.appendChild(trPrincipal);

      // Sub-tabela com os detalhes individuais (incluindo Laboratório)
      const trDetalhes = document.createElement('tr');
      trDetalhes.id = targetId;
      trDetalhes.style.display = 'none';
      trDetalhes.style.backgroundColor = '#f4f8f9';

      let linhasDet = listaFiltrada.map(item => `
        <tr>
          <td><b>Lab:</b> ${item.laboratorio || '-'}</td>
          <td><b>Máquina:</b> ${item.maquina || '-'}</td>
          <td><b>Prof/Solicitante:</b> ${item.solicitante || '-'}</td>
          <td><b>Curso:</b> ${item.curso || '-'}</td>
          <td><b>Funciona:</b> <span style="color: ${item.funciona === 'Sim' ? 'green' : 'red'}; font-weight: bold;">${item.funciona}</span></td>
          <td><b>Auditado por:</b> ${item.auditadoPor || '-'}</td>
        </tr>
      `).join('');

      trDetalhes.innerHTML = `
        <td colspan="5" style="padding: 10px;">
          <div style="border-left: 3px solid #008080; padding-left: 10px;">
            <small style="font-weight: bold;">Histórico Individual de Instalações:</small>
            <table style="width: 100%; margin-top: 5px; background: white; min-width: auto;">
              <tbody>${linhasDet}</tbody>
            </table>
          </div>
        </td>
      `;
      tabelaEl.appendChild(trDetalhes);
    });

    // Atualiza os contadores no topo da página
    const elTotal = document.getElementById('stat-total-softwares');
    const elOk = document.getElementById('stat-softwares-ok');
    const elErro = document.getElementById('stat-softwares-erro');

    if (elTotal) elTotal.textContent = totalMonitorados;
    if (elOk) elOk.textContent = totalOperacionais;
    if (elErro) elErro.textContent = totalComErro;

    if (totalMonitorados === 0) {
      tabelaEl.innerHTML = `<tr><td colspan="5">Nenhuma auditoria registrada.</td></tr>`;
    }
  } catch (err) {
    console.error("Erro ao listar auditoria de softwares:", err);
    tabelaEl.innerHTML = `<tr><td colspan="5">Erro ao carregar auditorias.</td></tr>`;
  }
}
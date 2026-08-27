import { db, auth } from './firebase.js';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  doc,
  setDoc,
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Cadastrar/Atualizar manutenção mantendo chave única por máquina (sem duplicar)
export async function cadastrarManutencao(dadosFormulario) {
  try {
    const usuarioAtual = auth.currentUser;
    if (!usuarioAtual) throw new Error("Usuário não autenticado.");

    // Gera ID único combinando Laboratório + Máquina
    const idUnico = `${dadosFormulario.laboratorio}_${dadosFormulario.identificacao}`.replace(/[\/\s]/g, '_');

    await setDoc(doc(db, "manutencoes", idUnico), {
      ...dadosFormulario,
      solicitanteEmail: usuarioAtual.email,
      solicitanteUid: usuarioAtual.uid,
      status: dadosFormulario.tudoFuncionando === "Não" ? "Pendente" : "OK",
      criadoEm: serverTimestamp()
    }, { merge: true });

    return idUnico;
  } catch (erro) {
    console.error("Erro ao cadastrar manutenção:", erro);
    throw erro;
  }
}

// 2. Listar chamados com filtro por aba de Laboratório e atualizar Cards dos Computadores
export async function listarManutencoes(tabelaElemento, labFiltro = "Todos", ocultarConcluidos = false) {
  if (!tabelaElemento) return;
  try {
    const q = query(collection(db, "manutencoes"), orderBy("criadoEm", "desc"));
    const querySnapshot = await getDocs(q);

    tabelaElemento.innerHTML = ""; 

    // Variáveis para os contadores do painel de computadores
    let totalPcs = 0;
    let pcsOk = 0;
    let pcsErro = 0;

    if (querySnapshot.empty) {
      tabelaElemento.innerHTML = '<tr><td colspan="15">Nenhum registro encontrado.</td></tr>';
      atualizarCardsPcs(0, 0, 0);
      return;
    }

    let contadorLinhasExibidas = 0;

    querySnapshot.forEach((docSnap) => {
      const dados = docSnap.data();
      const id = docSnap.id;
      const estaConcluido = dados.status === "Concluído";

      // Filtra por laboratório para os dados da tabela e dos cards
      if (labFiltro !== "Todos" && dados.laboratorio !== labFiltro) return;

      // Atualiza os contadores com base nas máquinas do laboratório selecionado
      totalPcs++;
      if (dados.tudoFuncionando === "Sim") {
        pcsOk++;
      } else {
        pcsErro++;
      }

      // Aplica o filtro de ocultar concluídos na exibição da tabela
      if (ocultarConcluidos && estaConcluido) return;

      contadorLinhasExibidas++;

      const linha = `
        <tr>
          <td>${dados.identificacao || '-'}</td>
          <td>${dados.patrimonioCpu || '-'}</td>
          <td>${dados.internetFunciona || '-'}</td>
          <td>${dados.detalhesInternet || '-'}</td>
          <td>${dados.bateria || '-'}</td>
          <td>${dados.estabilizadorFunciona || '-'}</td>
          <td>${dados.patrimonioEstabilizador || '-'}</td>
          <td>${dados.detalhesEstabilizador || '-'}</td>
          <td style="color: ${dados.tudoFuncionando === 'Não' ? 'red' : 'green'}; font-weight: bold;">
            ${dados.tudoFuncionando || '-'}
          </td>
          <td>${dados.motivoProblema || '-'}</td>
          <td>${dados.modeloComputador || '-'}</td>
          <td>${dados.so || '-'}</td>
          <td>${dados.verificadoPor || '-'}</td>
          <td><strong>${dados.status || 'Pendente'}</strong></td>
          <td>
            ${
              estaConcluido 
                ? '✅ Finalizado' 
                : `<button class="btn-concluir" data-id="${id}">Resolver</button>`
            }
          </td>
        </tr>
      `;
      tabelaElemento.innerHTML += linha;
    });

    // Atualiza os elementos visuais dos cards
    atualizarCardsPcs(totalPcs, pcsOk, pcsErro);

    if (contadorLinhasExibidas === 0) {
      tabelaElemento.innerHTML = '<tr><td colspan="15">Nenhum registro encontrado para este filtro.</td></tr>';
    }

  } catch (erro) {
    console.error("Erro ao carregar chamados:", erro);
    tabelaElemento.innerHTML = '<tr><td colspan="15">Erro ao carregar chamados.</td></tr>';
  }
}

// Função auxiliar para atualizar o HTML dos cards de computadores
function atualizarCardsPcs(total, ok, erro) {
  const elTotal = document.getElementById('stat-total-pcs');
  const elOk = document.getElementById('stat-pcs-ok');
  const elErro = document.getElementById('stat-pcs-erro');

  if (elTotal) elTotal.innerText = total;
  if (elOk) elOk.innerText = ok;
  if (elErro) elErro.innerText = erro;
}

// 3. Histórico de registros resolvidos
export async function listarHistorico(tabelaHistoricoElemento) {
  if (!tabelaHistoricoElemento) return;
  try {
    const q = query(collection(db, "manutencoes"), orderBy("criadoEm", "desc"));
    const querySnapshot = await getDocs(q);

    tabelaHistoricoElemento.innerHTML = "";
    let totalHistorico = 0;

    querySnapshot.forEach((docSnap) => {
      const dados = docSnap.data();
      if (dados.status === "Concluído") {
        totalHistorico++;
        const dataFormatada = dados.criadoEm?.toDate ? dados.criadoEm.toDate().toLocaleString('pt-BR') : '-';

        const linha = `
          <tr>
            <td>${dados.laboratorio || '-'}</td>
            <td>${dados.identificacao || '-'}</td>
            <td>${dados.patrimonioCpu || '-'}</td>
            <td>${dados.motivoProblema || '-'}</td>
            <td>${dados.verificadoPor || '-'}</td>
            <td>${dataFormatada}</td>
            <td><span style="color: green;"><strong>Resolvido</strong></span></td>
          </tr>
        `;
        tabelaHistoricoElemento.innerHTML += linha;
      }
    });

    if (totalHistorico === 0) {
      tabelaHistoricoElemento.innerHTML = '<tr><td colspan="7">Nenhum histórico de chamados resolvidos.</td></tr>';
    }
  } catch (erro) {
    console.error("Erro ao carregar histórico:", erro);
    tabelaHistoricoElemento.innerHTML = '<tr><td colspan="7">Erro ao carregar histórico.</td></tr>';
  }
}

// 4. Marcar como resolvido
export async function concluirManutencao(idChamado) {
  try {
    const chamadoRef = doc(db, "manutencoes", idChamado);
    await updateDoc(chamadoRef, { status: "Concluído" });
  } catch (erro) {
    console.error("Erro ao concluir chamado:", erro);
    throw erro;
  }
}

// 5. Registrar/Atualizar checagem de software (Sobrescreve estado anterior da mesma máquina)
export async function cadastrarChecagemSoftware(dadosSoftware) {
  try {
    const usuarioAtual = auth.currentUser;
    if (!usuarioAtual) throw new Error("Usuário não autenticado.");

    // Chave composta para impedir duplicação da máquina no mesmo software
    const idUnico = `${dadosSoftware.software}_${dadosSoftware.laboratorio}_${dadosSoftware.maquina}`.replace(/[\/\s]/g, '_');

    await setDoc(doc(db, "softwares_laboratorio", idUnico), {
      ...dadosSoftware,
      cadastradoPor: usuarioAtual.email,
      criadoEm: serverTimestamp()
    }, { merge: true });

    return idUnico;
  } catch (erro) {
    console.error("Erro ao registrar software:", erro);
    throw erro;
  }
}

// 6. Listar Auditoria de Softwares Agrupada com coluna de Laboratório
export async function listarAuditoriaSoftwares(tabelaElemento, termoBusca = "") {
  if (!tabelaElemento) return;
  try {
    const q = query(collection(db, "softwares_laboratorio"), orderBy("criadoEm", "desc"));
    const querySnapshot = await getDocs(q);

    tabelaElemento.innerHTML = "";

    if (querySnapshot.empty) {
      tabelaElemento.innerHTML = '<tr><td colspan="5">Nenhum software registrado até o momento.</td></tr>';
      document.getElementById('stat-total-softwares').innerText = '0';
      document.getElementById('stat-softwares-ok').innerText = '0';
      document.getElementById('stat-softwares-erro').innerText = '0';
      return;
    }

    const grupos = {};

    querySnapshot.forEach((docSnap) => {
      const d = docSnap.data();
      const nomeSoft = d.software || 'Não especificado';

      const busca = termoBusca.toLowerCase();
      const bateuBusca = 
        nomeSoft.toLowerCase().includes(busca) ||
        (d.maquina && d.maquina.toLowerCase().includes(busca)) ||
        (d.laboratorio && d.laboratorio.toLowerCase().includes(busca)) ||
        (d.curso && d.curso.toLowerCase().includes(busca)) ||
        (d.solicitante && d.solicitante.toLowerCase().includes(busca));

      if (termoBusca && !bateuBusca) return;

      if (!grupos[nomeSoft]) {
        grupos[nomeSoft] = {
          total: 0,
          ok: 0,
          erro: 0,
          ultimoteste: d.criadoEm?.toDate ? d.criadoEm.toDate().toLocaleString('pt-BR') : '-',
          itens: []
        };
      }

      grupos[nomeSoft].total++;
      if (d.funciona === "Sim") grupos[nomeSoft].ok++;
      else grupos[nomeSoft].erro++;

      grupos[nomeSoft].itens.push(d);
    });

    const chavesSoftwares = Object.keys(grupos);

    if (chavesSoftwares.length === 0) {
      tabelaElemento.innerHTML = '<tr><td colspan="5">Nenhum resultado para a busca.</td></tr>';
      return;
    }

    let countTotal = chavesSoftwares.length;
    let countOk = 0;
    let countErro = 0;

    chavesSoftwares.forEach((nomeSoft, index) => {
      const g = grupos[nomeSoft];
      const temErro = g.erro > 0;
      if (temErro) countErro++; else countOk++;

      const statusBadge = temErro 
        ? `<span style="color: red; font-weight: bold;">⚠️ ${g.erro} máq. com falha (${g.ok}/${g.total} OK)</span>`
        : `<span style="color: green; font-weight: bold;">✅ 100% Funcional (${g.ok}/${g.total} OK)</span>`;

      const linhaPrincipal = `
        <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : '#ffffff'}; font-weight: bold;">
          <td>💻 ${nomeSoft}</td>
          <td>${g.total} máquina(s)</td>
          <td>${statusBadge}</td>
          <td>${g.ultimoteste}</td>
          <td>
            <button class="btn-detalhes-soft" data-target="detalhe-soft-${index}" style="cursor: pointer; padding: 4px 8px;">
              👁️ Ver Detalhes
            </button>
          </td>
        </tr>
      `;

      let linhasDetalhesHTML = g.itens.map(item => `
        <tr>
          <td>Lab: <strong>${item.laboratorio || '-'}</strong></td>
          <td>Máquina: <strong>${item.maquina || '-'}</strong></td>
          <td>Prof/Solicitante: ${item.solicitante || '-'}</td>
          <td>Curso: ${item.curso || '-'}</td>
          <td style="color: ${item.funciona === 'Sim' ? 'green' : 'red'}; font-weight: bold;">
            Funciona: ${item.funciona || '-'}
          </td>
          <td>Auditado por: ${item.cadastradoPor || '-'}</td>
        </tr>
      `).join('');

      const linhaDetalheContainer = `
        <tr id="detalhe-soft-${index}" class="linha-detalhe-software" style="display: none; background-color: #f0f7f7;">
          <td colspan="5">
            <div style="padding: 10px; border-left: 3px solid #008080;">
              <small><strong>Histórico Individual de Instalações:</strong></small>
              <table border="1" style="width: 100%; margin-top: 5px; font-weight: normal; font-size: 0.9em; background: #fff;">
                ${linhasDetalhesHTML}
              </table>
            </div>
          </td>
        </tr>
      `;

      tabelaElemento.innerHTML += linhaPrincipal + linhaDetalheContainer;
    });

    const elTotalSofts = document.getElementById('stat-total-softwares');
    const elOkSofts = document.getElementById('stat-softwares-ok');
    const elErroSofts = document.getElementById('stat-softwares-erro');

    if (elTotalSofts) elTotalSofts.innerText = countTotal;
    if (elOkSofts) elOkSofts.innerText = countOk;
    if (elErroSofts) elErroSofts.innerText = countErro;

  } catch (erro) {
    console.error("Erro ao listar softwares:", erro);
    tabelaElemento.innerHTML = '<tr><td colspan="5">Erro ao carregar dados.</td></tr>';
  }
}
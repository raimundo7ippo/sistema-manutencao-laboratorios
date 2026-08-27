import { db, auth } from './firebase.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  doc,
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Cadastrar auditoria/manutenção completa com base na planilha
export async function cadastrarManutencao(dadosFormulario) {
  try {
    const usuarioAtual = auth.currentUser;
    if (!usuarioAtual) throw new Error("Usuário não autenticado.");

    const docRef = await addDoc(collection(db, "manutencoes"), {
      ...dadosFormulario,
      solicitanteEmail: usuarioAtual.email,
      solicitanteUid: usuarioAtual.uid,
      status: dadosFormulario.tudoFuncionando === "Não" ? "Pendente" : "OK",
      criadoEm: serverTimestamp()
    });
    return docRef.id;
  } catch (erro) {
    console.error("Erro ao cadastrar manutenção:", erro);
    throw erro;
  }
}

// 2. Listar chamados com filtro por aba de Laboratório
export async function listarManutencoes(tabelaElemento, labFiltro = "Todos", ocultarConcluidos = false) {
  try {
    const q = query(collection(db, "manutencoes"), orderBy("criadoEm", "desc"));
    const querySnapshot = await getDocs(q);

    tabelaElemento.innerHTML = ""; 

    if (querySnapshot.empty) {
      tabelaElemento.innerHTML = '<tr><td colspan="15">Nenhum registro encontrado.</td></tr>';
      return;
    }

    let contador = 0;

    querySnapshot.forEach((docSnap) => {
      const dados = docSnap.data();
      const id = docSnap.id;
      const estaConcluido = dados.status === "Concluído";

      // Filtro de laboratório (Aba)
      if (labFiltro !== "Todos" && dados.laboratorio !== labFiltro) return;

      // Filtro para ocultar resolvidos
      if (ocultarConcluidos && estaConcluido) return;

      contador++;

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

    if (contador === 0) {
      tabelaElemento.innerHTML = '<tr><td colspan="15">Nenhum registro encontrado para este filtro.</td></tr>';
    }

  } catch (erro) {
    console.error("Erro ao carregar chamados:", erro);
    tabelaElemento.innerHTML = '<tr><td colspan="15">Erro ao carregar chamados.</td></tr>';
  }
}

// 3. Histórico de registros resolvidos
export async function listarHistorico(tabelaHistoricoElemento) {
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
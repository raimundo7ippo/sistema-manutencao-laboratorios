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

export async function cadastrarManutencao(laboratorio, equipamento, descricao) {
  try {
    const usuarioAtual = auth.currentUser;
    if (!usuarioAtual) throw new Error("Usuário não autenticado.");

    const docRef = await addDoc(collection(db, "manutencoes"), {
      laboratorio,
      equipamento,
      descricao,
      solicitanteEmail: usuarioAtual.email,
      solicitanteUid: usuarioAtual.uid,
      status: "Pendente",
      criadoEm: serverTimestamp()
    });
    return docRef.id;
  } catch (erro) {
    console.error("Erro ao cadastrar manutenção:", erro);
    throw erro;
  }
}

export async function listarManutencoes(tabelaElemento, ocultarConcluidos = false) {
  try {
    const q = query(collection(db, "manutencoes"), orderBy("criadoEm", "desc"));
    const querySnapshot = await getDocs(q);

    tabelaElemento.innerHTML = ""; 

    if (querySnapshot.empty) {
      tabelaElemento.innerHTML = '<tr><td colspan="5">Nenhum chamado encontrado.</td></tr>';
      return;
    }

    let contador = 0;

    querySnapshot.forEach((docSnap) => {
      const dados = docSnap.data();
      const id = docSnap.id;
      const estaConcluido = dados.status === "Concluído";

      if (ocultarConcluidos && estaConcluido) {
        return; // Pula este item se a opção de ocultar estiver ativa
      }

      contador++;

      const linha = `
        <tr>
          <td>${dados.laboratorio || '-'}</td>
          <td>${dados.equipamento || '-'}</td>
          <td>${dados.descricao || '-'}</td>
          <td><strong>${dados.status || 'Pendente'}</strong></td>
          <td>
            ${
              estaConcluido 
                ? '✅ Finalizado' 
                : `<button class="btn-concluir" data-id="${id}">Marcar como Resolvido</button>`
            }
          </td>
        </tr>
      `;
      tabelaElemento.innerHTML += linha;
    });

    if (contador === 0) {
      tabelaElemento.innerHTML = '<tr><td colspan="5">Nenhum chamado pendente encontrado.</td></tr>';
    }

  } catch (erro) {
    console.error("Erro ao carregar chamados:", erro);
    tabelaElemento.innerHTML = '<tr><td colspan="5">Erro ao carregar chamados.</td></tr>';
  }
}

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
        const dataFormatada = dados.criadoEm?.toDate ? dados.criadoEm.toDate().toLocaleDateString('pt-BR') : '-';

        const linha = `
          <tr>
            <td>${dados.laboratorio || '-'}</td>
            <td>${dados.equipamento || '-'}</td>
            <td>${dados.descricao || '-'}</td>
            <td>${dataFormatada}</td>
            <td><span style="color: green;"><strong>Resolvido</strong></span></td>
          </tr>
        `;
        tabelaHistoricoElemento.innerHTML += linha;
      }
    });

    if (totalHistorico === 0) {
      tabelaHistoricoElemento.innerHTML = '<tr><td colspan="5">Nenhum histórico de chamados resolvidos.</td></tr>';
    }
  } catch (erro) {
    console.error("Erro ao carregar histórico:", erro);
    tabelaHistoricoElemento.innerHTML = '<tr><td colspan="5">Erro ao carregar histórico.</td></tr>';
  }
}

export async function concluirManutencao(idChamado) {
  try {
    const chamadoRef = doc(db, "manutencoes", idChamado);
    await updateDoc(chamadoRef, { status: "Concluído" });
  } catch (erro) {
    console.error("Erro ao concluir chamado:", erro);
    throw erro;
  }
}
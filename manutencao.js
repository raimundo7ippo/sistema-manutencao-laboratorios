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

export async function listarManutencoes(tabelaElemento) {
  try {
    const q = query(collection(db, "manutencoes"), orderBy("criadoEm", "desc"));
    const querySnapshot = await getDocs(q);

    tabelaElemento.innerHTML = ""; 

    if (querySnapshot.empty) {
      tabelaElemento.innerHTML = '<tr><td colspan="5">Nenhum chamado encontrado.</td></tr>';
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const dados = docSnap.data();
      const id = docSnap.id;
      const estaConcluido = dados.status === "Concluído";

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
  } catch (erro) {
    console.error("Erro ao carregar chamados:", erro);
    tabelaElemento.innerHTML = '<tr><td colspan="5">Erro ao carregar chamados.</td></tr>';
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
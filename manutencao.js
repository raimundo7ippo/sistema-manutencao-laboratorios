import { db, auth } from './firebase.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Função para cadastrar chamados
export async function cadastrarManutencao(laboratorio, equipamento, descricao) {
  try {
    const usuarioAtual = auth.currentUser;

    if (!usuarioAtual) {
      throw new Error("Usuário não autenticado.");
    }

    const docRef = await addDoc(collection(db, "manutencoes"), {
      laboratorio: laboratorio,
      equipamento: equipamento,
      descricao: descricao,
      solicitanteEmail: usuarioAtual.email,
      solicitanteUid: usuarioAtual.uid,
      status: "Pendente",
      criadoEm: serverTimestamp()
    });

    console.log("Chamado salvo com ID: ", docRef.id);
    return docRef.id;
  } catch (erro) {
    console.error("Erro ao cadastrar manutenção:", erro);
    throw erro;
  }
}

// 2. Função para buscar e exibir os chamados na tabela
export async function listarManutencoes(tabelaElemento) {
  try {
    const q = query(collection(db, "manutencoes"), orderBy("criadoEm", "desc"));
    const querySnapshot = await getDocs(q);

    tabelaElemento.innerHTML = ""; // Limpa a mensagem de carregando

    if (querySnapshot.empty) {
      tabelaElemento.innerHTML = '<tr><td colspan="4">Nenhum chamado encontrado.</td></tr>';
      return;
    }

    querySnapshot.forEach((doc) => {
      const dados = doc.data();
      const linha = `
        <tr>
          <td>${dados.laboratorio || '-'}</td>
          <td>${dados.equipamento || '-'}</td>
          <td>${dados.descricao || '-'}</td>
          <td><strong>${dados.status || 'Pendente'}</strong></td>
        </tr>
      `;
      tabelaElemento.innerHTML += linha;
    });
  } catch (erro) {
    console.error("Erro ao carregar chamados:", erro);
    tabelaElemento.innerHTML = '<tr><td colspan="4">Erro ao carregar chamados.</td></tr>';
  }
}
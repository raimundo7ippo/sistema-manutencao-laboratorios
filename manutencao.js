import { db, auth } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Função compartilhada: Usada na Home e no Admin para registrar chamados
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
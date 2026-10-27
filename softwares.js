import { db } from './firebase.js';
import {
  collection, getDocs, query, orderBy, serverTimestamp, doc, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { escapeHtml, sanitizarParaId } from './utils.js';

const COLECAO = "softwares";

// 1. DADOS
export async function cadastrarSoftware(dados) {
  // Cria um ID único juntando Lab, Máquina e Software para evitar duplicados
  const idUnico = sanitizarParaId(`${dados.laboratorio}_${dados.identificacao}_${dados.software}`);
  await setDoc(doc(db, COLECAO, idUnico), {
    ...dados,
    criadoEm: serverTimestamp(),
  }, { merge: true });
}

export async function buscarSoftwares() {
  const q = query(collection(db, COLECAO), orderBy("criadoEm", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, dados: docSnap.data() }));
}

export async function removerSoftware(idRegistro) {
  await deleteDoc(doc(db, COLECAO, idRegistro));
}

// 2. RENDERIZAÇÃO DA TABELA
export function renderizarPainelSoftwares(tabela, cabecalho, registros, labFiltro, filtroFalhas) {
  if (!tabela || !cabecalho) return;

  // Os cabeçalhos exatos que pediste aplicados a todos os laboratórios
  cabecalho.innerHTML = `<tr><th>Máquina / ID</th><th>Software</th><th>S.O.</th><th>Curso</th><th>Solicitante</th><th>Status</th><th>Ações</th></tr>`;

  let total = 0, ok = 0, erro = 0;
  const linhas = [];

  for (const { id, dados } of registros) {
    if (dados.laboratorio !== labFiltro) continue;

    if (dados.funciona === "Sim (OK)") ok++; else erro++;
    total++;

    // Se o botão "Ver Apenas Falhas" estiver ativo
    if (filtroFalhas && dados.funciona === "Sim (OK)") continue;

    const corStatus = dados.funciona === 'Sim (OK)' ? 'color: #28a745; font-weight: bold;' : 'color: #dc3545; font-weight: bold;';
    const iconeStatus = dados.funciona === 'Sim (OK)' ? '✅ OK' : '❌ Falha';

    linhas.push(`
      <tr style="border-bottom: 1px solid #eee;">
        <td><strong>${escapeHtml(dados.identificacao) || '-'}</strong></td>
        <td>${escapeHtml(dados.software) || '-'}</td>
        <td>${escapeHtml(dados.so) || '-'}</td>
        <td>${escapeHtml(dados.curso) || '-'}</td>
        <td>${escapeHtml(dados.solicitante) || '-'}</td>
        <td style="${corStatus}">${iconeStatus}</td>
        <td>
          <button class="btn-remover" data-id="${escapeHtml(id)}" style="background-color: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85em;">🗑️ Remover</button>
        </td>
      </tr>
    `);
  }

  // Atualiza as estatísticas no topo da página
  const elTotal = document.getElementById('stat-total-pcs');
  const elOk = document.getElementById('stat-pcs-ok');
  const elErro = document.getElementById('stat-pcs-erro');
  
  if (elTotal) elTotal.innerText = total;
  if (elOk) elOk.innerText = `${ok}/${total}`;
  if (elErro) elErro.innerText = erro;

  tabela.innerHTML = linhas.length > 0 ? linhas.join('') : '<tr><td colspan="7" style="text-align: center; padding: 20px;">Nenhum registo encontrado nesta visão.</td></tr>';
}
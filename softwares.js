import { db } from './firebase.js';
import {
  collection, getDocs, query, orderBy, serverTimestamp, doc, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { escapeHtml, sanitizarParaId } from './utils.js';

const COLECAO = "softwares_v2";

export const LISTA_SOFTWARES = {
  "Informática, Bloco I": [
    "Chrome", "Firefox", "Dev C++", "Wireshark 3.0", "MySQL Workbench", "Blender", 
    "MySQL Community Edition", "Stata", "Netbeans 11", "Java (latest)", "Python 3", 
    "QGIS", "GeoDA", "GeoDaSpace", "TerraView", "Musescore", "Autocad", "VS Code"
  ],
  "Programação Computacional": [
    "R e RStudio", "QGIS", "Blender", "GeoDA", "GeoDaSpace", "Dev C++", "Wireshark 3.0", 
    "MySQL Workbench", "MySQL Community Edition", "Stata", "Netbeans 11", "Java 8", 
    "Python 3", "TerraView", "Musescore", "PSPP", "PSIM", "PROTEUS", "Matlab", 
    "Sublime Text 3", "Arduino IDE", "Drive do Arduino", "WinPCap 4", "Visual Studio Code (VS Code)", 
    "Octave", "Scilab", "Autocad", "PyCharm", "DOSVOX", "NVDA", "NodeJS", "NPM", 
    "Eclipse", "Jamovi", "Spinmaker", "Jenkins", "Android Studio", "React Native", "Ionic"
  ],
  "Simulações Numéricas": [
    "Visual Studio Code (VS Code)", "Netbeans", "Blender", "Java 8/25", "R e RStudio", 
    "QGIS", "GeoDA", "GeoDaSpace", "TerraView", "Dev C++", "Wireshark 3.0", 
    "MySQL Workbench", "MySQL Community Edition", "Stata", "Python 3", "Musescore", 
    "PSPP", "PSIM", "PROTEUS", "Matlab", "Sublime Text 3", "Arduino IDE", "Drive do Arduino", 
    "WinPCap 4", "Scilab", "Octave", "Autocad", "PyCharm", "DOSVOX", "NVDA", 
    "R Project", "NodeJS", "NPM", "Jamovi", "Testes NVIDIA - Windows", "Testes NVIDIA - Linux", "Android Studio"
  ]
};

export async function salvarAuditoriaMaquina(dados) {
  const idUnico = sanitizarParaId(`${dados.laboratorio}_${dados.identificacao}`);
  await setDoc(doc(db, COLECAO, idUnico), {
    ...dados,
    atualizadoEm: serverTimestamp(),
  }, { merge: true });
}

export async function buscarAuditorias() {
  const q = query(collection(db, COLECAO), orderBy("atualizadoEm", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, dados: docSnap.data() }));
}

export async function removerAuditoria(idRegistro) {
  await deleteDoc(doc(db, COLECAO, idRegistro));
}

let direcaoOrdenacaoMaquina = 'asc';

export function renderizarPainelSoftwares(tabela, cabecalho, registros, labFiltro, termoBusca) {
  if (!tabela || !cabecalho) return;

  // Atualizado com a coluna Técnico
  cabecalho.innerHTML = `<tr><th>Máquina / ID</th><th>Softwares Operacionais</th><th>Progresso (%)</th><th>Última Atualização</th><th>Técnico</th><th>Ações</th></tr>`;

  const cabecalhosCelulas = cabecalho.querySelectorAll('th');
  if (cabecalhosCelulas.length > 0) {
    const thMaquina = cabecalhosCelulas[0];
    thMaquina.style.cursor = 'pointer';
    thMaquina.style.userSelect = 'none';
    thMaquina.style.backgroundColor = '#e9ecef';
    thMaquina.innerText += direcaoOrdenacaoMaquina === 'asc' ? ' ▲' : ' ▼';

    thMaquina.addEventListener('click', () => {
      direcaoOrdenacaoMaquina = direcaoOrdenacaoMaquina === 'asc' ? 'desc' : 'asc';
      renderizarPainelSoftwares(tabela, cabecalho, registros, labFiltro, termoBusca);
    });
  }

  const registrosFiltrados = registros.filter(({ dados }) => {
    if (dados.laboratorio !== labFiltro) return false;
    if (termoBusca && !String(dados.identificacao || '').toLowerCase().includes(termoBusca)) return false;
    return true;
  });

  registrosFiltrados.sort((a, b) => {
    const identA = String(a.dados?.identificacao || '').replace(/PC-/gi, '').trim();
    const identB = String(b.dados?.identificacao || '').replace(/PC-/gi, '').trim();

    const numA = parseInt(identA, 10);
    const numB = parseInt(identB, 10);

    let comparacao = 0;
    if (!isNaN(numA) && !isNaN(numB)) {
      comparacao = numA - numB;
    } else {
      comparacao = identA.localeCompare(identB, undefined, { numeric: true, sensitivity: 'base' });
    }

    return direcaoOrdenacaoMaquina === 'asc' ? comparacao : -comparacao;
  });

  const softwaresOficiais = LISTA_SOFTWARES[labFiltro] || [];
  const totalOficial = softwaresOficiais.length;

  let totalMaquinas = 0, maquinasOk = 0;
  const linhas = [];

  for (const { id, dados } of registrosFiltrados) {
    totalMaquinas++;
    const instaladosObj = dados.softwaresInstalados || {};
    
    let qtdFuncionando = 0;
    for (const soft of softwaresOficiais) {
      if (instaladosObj[soft] === true) qtdFuncionando++;
    }

    const percentual = totalOficial > 0 ? Math.round((qtdFuncionando / totalOficial) * 100) : 0;
    const corBadge = percentual === 100 ? 'background: #d4edda; color: #155724;' : (percentual >= 80 ? 'background: #fff3cd; color: #856404;' : 'background: #f8d7da; color: #721c24;');

    if (percentual === 100) maquinasOk++;

    const dataFormatada = dados.atualizadoEm?.toDate ? dados.atualizadoEm.toDate().toLocaleDateString('pt-BR') : 'Agora mesmo';

    linhas.push(`
      <tr style="border-bottom: 1px solid #eee;">
        <td><strong>🖥️ ${escapeHtml(dados.identificacao)}</strong></td>
        <td><span style="font-size: 1.1em; font-weight: bold; color: #008b8b;">${qtdFuncionando}</span> / ${totalOficial} softwares</td>
        <td><span style="padding: 4px 8px; border-radius: 4px; font-weight: bold; ${corBadge}">${percentual}%</span></td>
        <td><small>${dataFormatada}</small></td>
        <td>👤 ${escapeHtml(dados.verificadoPor) || '-'}</td>
        <td>
          <button class="btn-editar" data-id="${escapeHtml(id)}" style="background-color: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px; transition: 0.2s;">✏️ Editar</button>
          <button class="btn-remover" data-id="${escapeHtml(id)}" style="background-color: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; transition: 0.2s;">🗑️ Apagar</button>
        </td>
      </tr>
    `);
  }

  const statTotal = document.getElementById('stat-total-pcs');
  const statOk = document.getElementById('stat-pcs-ok');
  const statErro = document.getElementById('stat-pcs-erro');

  if (statTotal) statTotal.innerText = totalMaquinas;
  if (statOk) statOk.innerText = `${maquinasOk} / ${totalMaquinas}`;
  if (statErro) statErro.innerText = totalMaquinas - maquinasOk;

  tabela.innerHTML = linhas.length > 0 
    ? linhas.join('') 
    : `<tr><td colspan="6" style="text-align: center; padding: 25px; color: #666; font-size: 1.1em;">Nenhuma máquina auditada neste laboratório. Preencha o formulário acima para começar.</td></tr>`;
}
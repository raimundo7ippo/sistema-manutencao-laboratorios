/**
 * Módulo de Autenticação - DTI UFC
 * Gere o login, registo e logout de utilizadores usando o Firebase Auth.
 */

import { auth } from './firebase.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

/**
 * Cria um novo técnico no sistema (Apenas para o Administrador).
 * @param {string} email - E-mail institucional do novo técnico.
 * @param {string} senha - Palavra-passe temporária.
 * @returns {Promise<Object>} - Retorna o objeto do utilizador criado.
 */
export async function cadastrar(email, senha) {
  try {
    const credencial = await createUserWithEmailAndPassword(auth, email, senha);
    console.log("Utilizador criado com sucesso:", credencial.user.email);
    
    // O administrador permanece na página admin.html após cadastrar alguém
    return credencial.user;
  } catch (erro) {
    console.error("Erro ao cadastrar utilizador:", erro.message);
    throw erro;
  }
}

/**
 * Autentica um utilizador existente e redireciona-o para o painel correto.
 * @param {string} email - E-mail do utilizador.
 * @param {string} senha - Palavra-passe do utilizador.
 * @returns {Promise<Object>} - Retorna o objeto do utilizador autenticado.
 */
export async function entrar(email, senha) {
  try {
    const credencial = await signInWithEmailAndPassword(auth, email, senha);
    console.log("Login efetuado com sucesso:", credencial.user.email);

    // Substitui este e-mail pelo e-mail real do Administrador da DTI
    const emailAdmin = "admin@sistema-labs.com";

    if (credencial.user.email === emailAdmin) {
      // Redireciona para o painel de administração (gestão de utilizadores e sistema)
      window.location.href = "admin.html"; 
    } else {
      // Redireciona para o painel principal (Menu de vistorias para técnicos)
      window.location.href = "home.html"; 
    }

    return credencial.user;
  } catch (erro) {
    console.error("Erro na autenticação:", erro.message);
    throw erro;
  }
}

/**
 * Encerra a sessão do utilizador atual e redireciona para o ecrã de login.
 */
export async function sair() {
  try {
    await signOut(auth);
    console.log("Sessão encerrada com sucesso.");
    
    // Redireciona o utilizador de volta para a porta de entrada
    window.location.href = "index.html";
  } catch (erro) {
    console.error("Erro ao encerrar sessão:", erro.message);
    throw erro;
  }
}
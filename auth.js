import { auth } from './firebase.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// 1. Criar novo usuário (Cadastro)
export async function cadastrar(email, senha) {
  try {
    const credencial = await createUserWithEmailAndPassword(auth, email, senha);
    console.log("Usuário criado com sucesso:", credencial.user.email);
    
    // 🔴 REMOVIDO: window.location.href = "home.html";
    // Assim o admin continua na tela do admin.html após cadastrar alguém!

    return credencial.user;
  } catch (erro) {
    console.error("Erro ao cadastrar:", erro.message);
    throw erro;
  }
}

// 2. Entrar na conta (Login)
export async function entrar(email, senha) {
  try {
    const credencial = await signInWithEmailAndPassword(auth, email, senha);
    console.log("Login realizado com sucesso:", credencial.user.email);

    // 🔴 TROQUE "admin@seu-sistema.com" PELO SEU E-MAIL REAL DE ADMIN:
    if (credencial.user.email === "seu-email-admin@exemplo.com") {
      // Envia para o painel de administrador
      window.location.href = "admin.html"; 
    } else {
      // Envia para a home comum de usuário
      window.location.href = "home.html"; 
    }

    return credencial.user;
  } catch (erro) {
    console.error("Erro ao entrar:", erro.message);
    throw erro;
  }
}

// 3. Sair da conta (Logout)
export async function sair() {
  try {
    await signOut(auth);
    console.log("Usuário deslogado com sucesso.");
  } catch (erro) {
    console.error("Erro ao sair:", erro.message);
  }
}
import { auth } from './firebase.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';

// 1. Criar novo usuário (Cadastro)
export async function cadastrar(email, senha) {
  try {
    const credencial = await createUserWithEmailAndPassword(auth, email, senha);
    console.log("Usuário criado com sucesso:", credencial.user.email);
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
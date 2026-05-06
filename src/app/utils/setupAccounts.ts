import { api } from './api';

/**
 * Script de setup para criar as contas iniciais de Amanda e Mateus
 * Execute este arquivo apenas uma vez para criar as contas
 */
export async function setupAccounts() {
  const accounts = [
    {
      name: 'Amanda',
      email: 'amanda@mesinhadocasal.com',
      password: 'senha-amanda-123' // IMPORTANTE: Trocar essa senha!
    },
    {
      name: 'Mateus',
      email: 'mateus@mesinhadocasal.com',
      password: 'senha-mateus-123' // IMPORTANTE: Trocar essa senha!
    }
  ];

  console.log('🔧 Iniciando setup das contas...');

  for (const account of accounts) {
    try {
      const response = await api.signup(account.email, account.password, account.name);
      console.log(`✅ Conta criada com sucesso: ${account.name}`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Senha: ${account.password}`);
    } catch (error) {
      console.error(`❌ Erro ao criar conta de ${account.name}:`, error);
    }
  }

  console.log('');
  console.log('🔐 IMPORTANTE: Guarde essas senhas em um local seguro!');
  console.log('💡 Recomendação: Troque as senhas padrão após o primeiro login.');
}

// Para executar o setup, abra o console do navegador e digite:
// import('/src/app/utils/setupAccounts.ts').then(m => m.setupAccounts())

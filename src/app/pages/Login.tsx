import { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { syncService } from '../utils/syncService';

import buttonBg from 'figma:asset/75c872bdf2a28b8670edf0ef3851acf422588625.png';
import buttonImage from 'figma:asset/85f171ff8cd9cb4f7140b1d04b0f2e0ecceb0615.png';
import headerDecoration from 'figma:asset/1f94cbc6275b0a35eb5a9c6c93b92d94e2251075.png';

interface LoginProps {
  onLoginSuccess: (profile: 'Amanda' | 'Mateus') => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [selectedProfile, setSelectedProfile] = useState<'Amanda' | 'Mateus' | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProfile) {
      toast.error('Por favor, selecione Amanda ou Mateus');
      return;
    }

    if (!password) {
      toast.error('Por favor, preencha a senha');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.login(selectedProfile, password);

      if (response.error) {
        toast.error('Senha incorreta. Tente novamente.');
      } else if (response.success) {
        // Salvar perfil no localStorage
        localStorage.setItem('userProfile', selectedProfile);

        toast.success(`Bem-vindo(a), ${selectedProfile}! 💕`);

        // Aguardar um pouco antes de chamar o callback
        await new Promise(resolve => setTimeout(resolve, 100));

        onLoginSuccess(selectedProfile);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F6F3] flex items-center justify-center p-4">
      <div className="w-full max-w-[390px]">
        {/* Header Decoration */}
        <div className="w-full h-[100px] flex items-center justify-center mb-4">
          <img 
            src={headerDecoration} 
            alt="" 
            className="w-full max-w-[600px] h-auto object-contain opacity-60"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-semibold text-[#2D3436] mb-2">
            - Mesinha -
          </h1>
          <p className="text-sm text-[#636E72]">
            Quem está entrando?
          </p>
        </motion.div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Seleção de perfil */}
          <div className="flex gap-3">
            {/* Botão Amanda */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedProfile('Amanda')}
              className="flex-1 relative overflow-hidden rounded-full"
              style={{ height: '56px' }}
            >
              <img 
                src={buttonBg} 
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                selectedProfile === 'Amanda' 
                  ? 'bg-[#81D8D0]/20 ring-2 ring-[#81D8D0] ring-inset' 
                  : ''
              }`}>
                <span className={`text-base font-medium transition-colors ${
                  selectedProfile === 'Amanda' ? 'text-[#2D3436]' : 'text-[#636E72]'
                }`}>
                  Amanda
                </span>
              </div>
            </motion.button>

            {/* Botão Mateus */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedProfile('Mateus')}
              className="flex-1 relative overflow-hidden rounded-full"
              style={{ height: '56px' }}
            >
              <img 
                src={buttonBg} 
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                selectedProfile === 'Mateus' 
                  ? 'bg-[#81D8D0]/20 ring-2 ring-[#81D8D0] ring-inset' 
                  : ''
              }`}>
                <span className={`text-base font-medium transition-colors ${
                  selectedProfile === 'Mateus' ? 'text-[#2D3436]' : 'text-[#636E72]'
                }`}>
                  Mateus
                </span>
              </div>
            </motion.button>
          </div>

          {/* Campo de senha */}
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full px-4 py-3 bg-white rounded-xl border border-[#DFE6E9] focus:border-[#81D8D0] focus:outline-none focus:ring-2 focus:ring-[#81D8D0]/20 transition-all"
              disabled={isLoading}
            />
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            className="w-full relative overflow-hidden rounded-full shadow-md disabled:opacity-50"
            style={{ height: '56px' }}
            disabled={isLoading}
          >
            <img
              src={buttonImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-lg font-medium drop-shadow-md">
                {isLoading ? 'Entrando...' : 'Entrar'}
              </span>
            </div>
          </button>
        </form>

      </div>
    </div>
  );
}

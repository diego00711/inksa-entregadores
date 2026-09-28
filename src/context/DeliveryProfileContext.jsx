// Ficheiro: src/context/DeliveryProfileContext.jsx (VERSÃO COM UPDATE)

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import  authService  from '../services/authService.js';
import DeliveryService from '../services/deliveryService.js';
import { obterTokenFCM, saveFcmToken } from '../services/notificationService.js';
import { DELIVERY_API_URL, createAuthHeaders } from '../services/api.js';

const DeliveryProfileContext = createContext(null);

export function useProfile() {
  return useContext(DeliveryProfileContext);
}

export function DeliveryProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Registra o aparelho pra receber push. Idempotente: salvar o mesmo token
   * de novo não faz mal, e o servidor sobrescreve.
   *
   * Precisa rodar TAMBÉM na retomada de sessão, não só no login. O entregador
   * abre o app já logado por semanas a fio — se o registro acontece apenas
   * dentro do login(), quem não deslogar nunca é perguntado. Era exatamente
   * essa a causa dos 6 entregadores com ZERO token: nenhum deles ia refazer
   * login só pra isso.
   */
  const registrarPush = useCallback(async () => {
    try {
      const { token, erro } = await obterTokenFCM();
      if (!token) {
        console.warn('Push: token não gerado —', erro);
        return;
      }
      const r = await saveFcmToken(token, DELIVERY_API_URL, createAuthHeaders());
      if (!r?.ok) console.warn('Push: servidor não salvou o token —', r?.motivo);
    } catch (e) {
      console.warn('Push: falha ao registrar (não bloqueia o app):', e);
    }
  }, []);

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (authService.isAuthenticated()) {
        try {
          // TRÊS TENTATIVAS antes de desistir (1s e 3s de espera).
          //
          // O caso real é o entregador abrindo o app na rua: entra num prédio,
          // o sinal some por dois segundos e volta. Uma tentativa só transforma
          // esse soluço em tela de login. E cobre também o backend acordando
          // depois de um deploy, que leva pouco mais de um minuto.
          //
          // Não insiste além disso: se o servidor estiver mesmo fora, ficar
          // tentando só segura a tela de carregamento na frente da pessoa.
          let profileData = null;
          let ultimoErro = null;
          for (const espera of [0, 1000, 3000]) {
            if (espera) await new Promise((r) => setTimeout(r, espera));
            try {
              profileData = await DeliveryService.getDeliveryProfile();
              ultimoErro = null;
              break;
            } catch (e) {
              ultimoErro = e;
              // Sessão expirada de verdade não melhora com insistência: o
              // apiClient já tentou renovar e desistiu, e já disparou o
              // 'auth:unauthorized'. Repetir só atrasaria a tela em 4s.
              if (/sess[ãa]o expirada/i.test(e?.message || '')) break;
            }
          }
          if (ultimoErro) throw ultimoErro;
          setProfile(profileData);
          setIsAuthenticated(true);
          registrarPush();
        } catch (error) {
          // ⚠️ NÃO DESLOGA AQUI (corrigido em 27/09/2026).
          //
          // Esta linha era `authService.logout()` em QUALQUER erro — e rodava
          // a cada abertura do app. Ou seja, o entregador era expulso quando:
          //
          //   * o sinal oscilava (entrar num prédio, num elevador);
          //   * o backend estava lento ou fora — no apagão de 26/09 todo mundo
          //     que abriu o app foi deslogado;
          //   * havia deploy do backend rolando (~1min15 de 502 a cada envio).
          //
          // Nada disso é sessão inválida. E o `apiFetch` já tem o cuidado de
          // devolver 503 (não 401) quando a rede cai, justamente "pra manter a
          // sessão viva pra próxima tentativa" — cuidado que este catch
          // desfazia.
          //
          // É o MESMO conserto que o `processResponse` recebeu em 09/09/2026,
          // e que este arquivo não recebeu junto. Quem decide que a sessão
          // acabou é o apiClient: ele só desiste depois de a renovação falhar
          // de verdade, e aí dispara 'auth:unauthorized', que o App.jsx trata
          // com aviso e navegação. Aqui a gente só não confirma a sessão e
          // deixa a próxima tentativa acontecer.
          console.error('Falha ao carregar o perfil (sessão preservada).', error);
        }
      }
      setLoading(false);
    };
    checkAuthStatus();
  }, [registrarPush]);

  const login = async (email, password) => {
    await authService.login(email, password);
    const profileData = await DeliveryService.getDeliveryProfile();
    setProfile(profileData);
    setIsAuthenticated(true);

    await registrarPush();
    return profileData;
  };

  const logout = () => {
    authService.logout();
    setProfile(null);
    setIsAuthenticated(false);
  };

  // useCallback com identidade ESTÁVEL: esta função entra em arrays de
  // dependência de efeitos (DeliveryDashboard). Sem memoização, cada
  // setProfile re-renderizava o provider → nova função → efeitos re-rodavam →
  // novo updateProfile → novo setProfile... um laço que martelava o backend
  // com PUT /delivery/profile várias vezes por segundo (visto nos logs do E2E).
  const updateProfile = useCallback(async (profileData) => {
    const updatedProfile = await DeliveryService.updateDeliveryProfile(profileData);
    setProfile(updatedProfile); // Atualiza o perfil em toda a aplicação
    return updatedProfile;
  }, []);

  const value = {
    profile,
    loading,
    isAuthenticated,
    login,
    logout,
    updateProfile, // ✅ NOVO: Disponibilizamos a função para quem usar o contexto
  };

  return (
    <DeliveryProfileContext.Provider value={value}>
      {children}
    </DeliveryProfileContext.Provider>
  );
}

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import {
  confirmPasswordRecovery,
  deleteAccount,
  getCurrentUser,
  requestPasswordRecovery,
  signIn,
  signOut,
  signUp,
} from "./api";

export const authKeys = {
  user: ["auth", "user"] as const,
};

/**
 * Oturum kapandığında (çıkış veya hesap silme) önbelleği temizler.
 * 1) Önce oturumu MEVCUT sorgu üzerinde null yapar: onu dinleyen tüm bileşenlere
 *    (kök layout dahil) haber verilir ve korumalı rota giriş ekranına yönlendirir.
 *    (queryClient.clear() KULLANILMAZ: sorguları siler ama dinleyenlere haber vermez.)
 * 2) Sonra oturum dışındaki tüm sorguları siler: önceki kullanıcının hiçbir verisi kalmaz.
 */
function resetToSignedOut(queryClient: QueryClient): void {
  queryClient.setQueryData(authKeys.user, null);
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== authKeys.user[0],
  });
}

/** data: kullanıcı nesnesi (giriş yapılmış) | null (giriş yapılmamış). */
export function useSession() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: getCurrentUser,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signIn,
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user, user);
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signUp,
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user, user);
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => resetToSignedOut(queryClient),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    // Kullanıcı sunucuda silindiği için oturumu da geçersiz; yerel durumu sıfırla.
    onSuccess: () => resetToSignedOut(queryClient),
  });
}

export function useRequestPasswordRecovery() {
  return useMutation({ mutationFn: requestPasswordRecovery });
}

export function useConfirmPasswordRecovery() {
  return useMutation({ mutationFn: confirmPasswordRecovery });
}

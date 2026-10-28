import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCurrentUser, signIn, signOut, signUp } from "./api";

export const authKeys = {
  user: ["auth", "user"] as const,
};

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
    onSuccess: () => {
      // 1) Önce oturumu MEVCUT sorgu üzerinde null yap. Var olan sorguyu güncellemek
      //    onu dinleyen tüm bileşenlere (kök layout dahil) haber verir; korumalı rota
      //    kullanıcıyı hemen giriş ekranına yönlendirir.
      //    (queryClient.clear() burada KULLANILMAZ: sorguları siler ama dinleyen
      //    bileşenlere haber vermez, kök layout eski oturum değerinde kalır.)
      queryClient.setQueryData(authKeys.user, null);

      // 2) Sonra oturum dışındaki tüm sorguları sil: önceki kullanıcının hiçbir
      //    verisi (işlemler, kategoriler, portföy...) önbellekte kalmasın.
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== authKeys.user[0],
      });
    },
  });
}

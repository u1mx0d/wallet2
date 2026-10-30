import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { realtime } from "@/lib/appwrite/client";

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
 * 3) Bekleyen işlem kuyruğunu temizler: bir kullanıcının gönderilmemiş işlemleri aynı
 *    telefonda başka bir kullanıcının oturumuyla ASLA gönderilmez.
 */
function resetToSignedOut(queryClient: QueryClient): void {
  queryClient.setQueryData(authKeys.user, null);
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== authKeys.user[0],
  });
  queryClient.getMutationCache().clear();
}

/**
 * Realtime bağlantısını oturum silinmeden ÖNCE düzgünce kapatır. Aksi halde sunucu, silinen
 * oturumun bağlantısını kendisi koparır; SDK bunu "WebSocket error" olarak yazar ve yeniden
 * bağlanmaya çalışır. Kapatma başarısız olsa bile çıkış devam eder.
 */
async function disconnectRealtime(): Promise<void> {
  try {
    await realtime.disconnect();
  } catch {
    // Bağlantı zaten kapalıysa veya kapatılamazsa çıkışı engelleme.
  }
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
    mutationFn: async () => {
      await disconnectRealtime();
      await signOut();
    },
    onSuccess: () => resetToSignedOut(queryClient),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await disconnectRealtime();
      await deleteAccount();
    },
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

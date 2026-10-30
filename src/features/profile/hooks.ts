import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authKeys } from "@/features/auth/hooks";
import { account } from "@/lib/appwrite/client";

/** Adı günceller; oturumdaki kullanıcı bilgisi (selamlama, profil) anında yenilenir. */
export function useUpdateName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => account.updateName({ name }),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user, user);
    },
  });
}

import { useSession } from "./hooks";

/**
 * Giriş yapmış kullanıcının ID'si. Yalnızca (app) grubundaki ekranlarda kullanılır;
 * korumalı rota bu ekranlara oturumsuz girilmesini zaten engeller.
 */
export function useCurrentUserId(): string {
  const session = useSession();
  const userId = session.data?.$id;
  if (!userId) {
    throw new Error(
      "useCurrentUserId yalnızca giriş yapılmış ekranlarda kullanılabilir.",
    );
  }
  return userId;
}

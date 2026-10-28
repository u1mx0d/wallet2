import { Permission, Role } from "react-native-appwrite";

/**
 * Kullanıcıya ait her satır bu izinlerle oluşturulur: yalnızca sahibi
 * okuyabilir, güncelleyebilir ve silebilir.
 *
 * Uygulamada satır oluşturan HER çağrı bu fonksiyonu kullanmalı. İzinleri
 * tek yerden vermek, bir ekranda yanlışlıkla Role.users() gibi geniş bir
 * izin verilmesini engeller.
 *
 * Not: Appwrite, bir kullanıcının kendisi dışındaki bir rol için izin
 * vermesini zaten reddeder (izolasyon testinde doğrulanıyor).
 */
export function ownerPermissions(userId: string): string[] {
  if (userId.trim().length === 0) {
    throw new Error("ownerPermissions: userId boş olamaz.");
  }
  const owner = Role.user(userId);
  return [
    Permission.read(owner),
    Permission.update(owner),
    Permission.delete(owner),
  ];
}

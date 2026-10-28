import { AppwriteException } from "react-native-appwrite";

/**
 * Appwrite hata türü → kullanıcıya gösterilecek Türkçe mesaj.
 * Tür adları Appwrite'ın response codes sayfasındandır. Listede olmayan bir türle
 * karşılaşırsan mesajın sonundaki koddan bulup buraya ekleyebilirsin.
 */
const MESSAGES_BY_TYPE: Record<string, string> = {
  user_invalid_credentials: "E-posta veya şifre hatalı.",
  user_already_exists: "Bu e-posta adresiyle kayıtlı bir hesap zaten var.",
  user_blocked: "Bu hesap devre dışı bırakılmış.",
  user_unauthorized: "Bu işlem için yetkin yok.",
  general_unauthorized_scope: "Oturumun sona ermiş. Lütfen tekrar giriş yap.",
  general_rate_limit_exceeded:
    "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar dene.",
  password_recently_used:
    "Bu şifreyi yakın zamanda kullandın. Farklı bir şifre seç.",
  password_personal_data:
    "Şifre; adını, e-posta adresini veya telefon numaranı içeremez.",
};

const NETWORK_MESSAGE =
  "İnternet bağlantısı yok gibi görünüyor. Bağlantını kontrol edip tekrar dene.";

/** fetch, ağ yokken AppwriteException değil TypeError fırlatır. */
export function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError && /network request failed/i.test(error.message)
  );
}

export function isAppwriteError(
  error: unknown,
  type?: string,
): error is AppwriteException {
  return (
    error instanceof AppwriteException &&
    (type === undefined || error.type === type)
  );
}

/** Her türlü hatayı kullanıcıya gösterilebilir tek bir Türkçe cümleye çevirir. */
export function getErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return NETWORK_MESSAGE;

  if (error instanceof AppwriteException) {
    const byType = MESSAGES_BY_TYPE[error.type];
    if (byType) return byType;
    if (error.code === 429)
      return MESSAGES_BY_TYPE.general_rate_limit_exceeded ?? NETWORK_MESSAGE;
    if (error.code >= 500)
      return "Sunucuda geçici bir sorun var. Lütfen biraz sonra tekrar dene.";
    return `Beklenmeyen bir hata oluştu (${error.code}${error.type ? `, ${error.type}` : ""}).`;
  }

  return "Beklenmeyen bir hata oluştu.";
}

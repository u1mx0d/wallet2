/**
 * Kullanıcı adına yapılan sunucu işleri (Appwrite planındaki Function sınırı nedeniyle tek Function).
 *
 * Tetiklenme ve yollar:
 *  - event users.*.create            → varsayılan kategoriler (kimlik: event'teki kullanıcı nesnesi)
 *  - http  POST /default-categories  → varsayılan kategoriler (kategorisi olmayan eski kullanıcılar)
 *  - http  POST /delete-account      → hesap ve tüm veriler
 *  - http  POST /trades              → alım/satım ekleme, düzenleme, silme (hesap motoruyla doğrulanır)
 *
 * GÜVENLİK: http çağrılarında kullanıcı kimliği YALNIZCA x-appwrite-user-id header'ından alınır;
 * istek gövdesindeki hiçbir kimlik bilgisi kullanılmaz.
 */
import { Client, TablesDB, Users } from "node-appwrite";

import { createDefaultCategories } from "./default-categories.js";
import { deleteUserAndData } from "./delete-account.js";
import { handleTradeRequest, TradeRequestError } from "./trades.js";

function parseJson(text) {
  try {
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);
  const tablesDB = new TablesDB(client);
  const trigger = req.headers["x-appwrite-trigger"];

  // ─── Event: yeni kullanıcı ───────────────────────────────────────────────
  if (trigger === "event") {
    const payload = parseJson(req.bodyText);
    const userId = typeof payload.$id === "string" ? payload.$id : null;
    if (!userId) return res.json({ ok: false, error: "invalid_event" }, 400);

    try {
      const result = await createDefaultCategories({ tablesDB, userId });
      log(
        `[event] Kullanıcı ${userId}: ${result.created} kategori oluşturuldu, ${result.existing} zaten vardı.`,
      );
      return res.json({ ok: true, ...result });
    } catch (cause) {
      error(`[event] Kullanıcı ${userId}: ${cause?.message ?? cause}`);
      return res.json({ ok: false, error: "default_categories_failed" }, 500);
    }
  }

  // ─── HTTP: yalnızca giriş yapmış kullanıcı ───────────────────────────────
  if (trigger !== "http")
    return res.json({ ok: false, error: "unsupported_trigger" }, 400);

  const userId = req.headers["x-appwrite-user-id"];
  if (typeof userId !== "string" || userId.length === 0) {
    return res.json({ ok: false, error: "unauthorized" }, 401);
  }

  switch (req.path) {
    case "/default-categories": {
      try {
        const result = await createDefaultCategories({ tablesDB, userId });
        log(
          `[default-categories] Kullanıcı ${userId}: ${result.created} oluşturuldu, ${result.existing} zaten vardı.`,
        );
        return res.json({ ok: true, ...result });
      } catch (cause) {
        error(
          `[default-categories] Kullanıcı ${userId}: ${cause?.message ?? cause}`,
        );
        return res.json({ ok: false, error: "default_categories_failed" }, 500);
      }
    }

    case "/delete-account": {
      try {
        const deleted = await deleteUserAndData({
          tablesDB,
          users: new Users(client),
          userId,
        });
        // Loglarda yalnızca kullanıcı ID'si ve sayılar var; e-posta, ad gibi kişisel veri yok.
        log(
          `[delete-account] Kullanıcı ${userId} ve verileri silindi: ${JSON.stringify(deleted)}`,
        );
        return res.json({ ok: true, deleted });
      } catch (cause) {
        error(
          `[delete-account] Kullanıcı ${userId} silinemedi: ${cause?.message ?? cause}`,
        );
        return res.json({ ok: false, error: "delete_failed" }, 500);
      }
    }

    case "/trades": {
      const body = parseJson(req.bodyText);
      try {
        const result = await handleTradeRequest({ tablesDB, userId, body });
        log(`[trades] Kullanıcı ${userId}: ${body.action} başarılı.`);
        return res.json({ ok: true, ...result });
      } catch (cause) {
        if (cause instanceof TradeRequestError) {
          log(
            `[trades] Kullanıcı ${userId}: ${body.action} reddedildi (${cause.code}).`,
          );
          return res.json(
            { ok: false, error: cause.code, message: cause.message },
            cause.status,
          );
        }
        error(`[trades] Kullanıcı ${userId}: ${cause?.message ?? cause}`);
        return res.json(
          { ok: false, error: "trade_failed", message: "İşlem kaydedilemedi." },
          500,
        );
      }
    }

    default:
      return res.json({ ok: false, error: "not_found" }, 404);
  }
};

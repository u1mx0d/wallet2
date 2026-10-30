/**
 * Zamanlanmış fiyat servisi.
 *
 * Tetiklenme: schedule (Appwrite saatlik aralık; saatin dakikasını Appwrite seçer) veya
 * Console'dan elle (http).
 *
 * KİMİN ÇALIŞTIRABİLECEĞİNİ Appwrite belirler: appwrite.config.json → "execute": [].
 * Bu ayarla uygulama kullanıcılarının istekleri Function'a HİÇ ULAŞMAZ; yalnızca zamanlayıcı
 * ve Console (proje yöneticisi) çalıştırabilir. Console istekleri yöneticinin kullanıcı
 * kimliğini taşıdığı için kodda kullanıcı kimliğine göre ayrım YAPILMAZ.
 * ⚠️ "execute" ayarı değiştirilirse Bürküt kotası kullanıcılara açılır (ADIM 10 kontrol listesi).
 *
 * Zamanlanmış çalıştırma seans penceresi dışındaysa (hafta sonu, gece) sağlayıcıya
 * İSTEK ATMADAN biter. Pencere içindeki her çalıştırma sağlayıcıya TEK istek atar.
 * Sağlayıcı anahtarı yalnızca Function ortam değişkenindedir: BURKUT_API_KEY.
 */
import { Client, Query, TablesDB } from "node-appwrite";

import {
  isEndOfDayRun,
  isWithinMarketWindow,
  parseBurkutResponse,
  planStaleMarks,
  planWrites,
} from "./core.js";

// scripts/appwrite/setup.mjs ve src/lib/appwrite/schema.ts ile aynı olmalı.
const DATABASE_ID = "wallet";
const PRICE_TABLE_ID = "price_cache";
const TRADES_TABLE_ID = "trades";

const PROVIDER_URL = "https://api.burkutportfoy.com/api/public/v1/stocks";
const FETCH_TIMEOUT_MS = 15_000;
const PAGE_SIZE = 100;
const WRITE_CONCURRENCY = 5;

class ProviderError extends Error {
  constructor(message, status, retryAfter) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

async function fetchProvider(apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(PROVIDER_URL, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ProviderError(
        `Sağlayıcı HTTP ${response.status} döndü.`,
        response.status,
        response.headers.get("retry-after"),
      );
    }
    return await response.json();
  } catch (cause) {
    if (cause instanceof ProviderError) throw cause;
    const reason =
      cause?.name === "AbortError"
        ? `${FETCH_TIMEOUT_MS} ms içinde yanıt yok`
        : cause?.message;
    throw new ProviderError(`Sağlayıcıya ulaşılamadı: ${reason}`, null, null);
  } finally {
    clearTimeout(timer);
  }
}

/** Portföylerde (herhangi bir kullanıcının işlemlerinde) geçen semboller. */
async function listHeldSymbols(tablesDB) {
  const symbols = new Set();
  let cursor;
  for (;;) {
    const queries = [Query.limit(PAGE_SIZE)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TRADES_TABLE_ID,
      queries,
    });
    for (const row of result.rows) {
      if (typeof row.symbol === "string") symbols.add(row.symbol);
    }
    const last = result.rows[result.rows.length - 1];
    if (result.rows.length < PAGE_SIZE || !last) return symbols;
    cursor = last.$id;
  }
}

/** price_cache'teki mevcut satırlar: sembol → satır. */
async function listExistingPrices(tablesDB) {
  const rows = new Map();
  let cursor;
  for (;;) {
    const queries = [Query.limit(PAGE_SIZE)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: PRICE_TABLE_ID,
      queries,
    });
    for (const row of result.rows) rows.set(row.symbol, row);
    const last = result.rows[result.rows.length - 1];
    if (result.rows.length < PAGE_SIZE || !last) return rows;
    cursor = last.$id;
  }
}

/** Satır ID'si sembolün kendisi. Önce beklenen işlemi dener, çakışmada diğerine düşer. */
async function writeRow(tablesDB, { symbol, create, data }) {
  const params = {
    databaseId: DATABASE_ID,
    tableId: PRICE_TABLE_ID,
    rowId: symbol,
    data,
  };
  if (create) {
    try {
      await tablesDB.createRow(params);
    } catch (cause) {
      if (cause?.code !== 409) throw cause;
      await tablesDB.updateRow(params);
    }
  } else {
    try {
      await tablesDB.updateRow(params);
    } catch (cause) {
      if (cause?.code !== 404) throw cause;
      await tablesDB.createRow(params);
    }
  }
}

async function runInChunks(items, worker) {
  let succeeded = 0;
  const failures = [];
  for (let index = 0; index < items.length; index += WRITE_CONCURRENCY) {
    const chunk = items.slice(index, index + WRITE_CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(worker));
    results.forEach((result, offset) => {
      if (result.status === "fulfilled") succeeded += 1;
      else
        failures.push(
          `${String(chunk[offset]?.symbol ?? chunk[offset])}: ${result.reason?.message ?? result.reason}`,
        );
    });
  }
  return { succeeded, failures };
}

async function markStale(tablesDB, symbols) {
  return runInChunks(symbols, (symbol) =>
    tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: PRICE_TABLE_ID,
      rowId: symbol,
      data: { stale: true },
    }),
  );
}

export default async ({ req, res, log, error }) => {
  const trigger = req.headers["x-appwrite-trigger"];
  const hasUserId = Boolean(req.headers["x-appwrite-user-id"]);
  log(
    `Tetikleyici: ${trigger ?? "yok"} · kullanıcı kimliği: ${hasUserId ? "var" : "yok"}`,
  );

  // Kimin çalıştırabileceğini Appwrite'ın "execute" izni belirler (bkz. dosya başı).
  // Burada yalnızca beklenmeyen tetikleyiciler (ör. event) reddedilir.
  if (trigger !== "schedule" && trigger !== "http") {
    error(`Beklenmeyen tetikleyici: ${trigger ?? "yok"}`);
    return res.json({ ok: false, error: "unsupported_trigger" }, 400);
  }

  const now = new Date();

  // Seans dışındaki zamanlanmış çalıştırmalar kota harcamaz. Elle çalıştırma her zaman devam eder.
  if (trigger === "schedule" && !isWithinMarketWindow(now)) {
    log(
      `Seans penceresi dışında (${now.toISOString()}); sağlayıcıya istek atılmadı.`,
    );
    return res.json({ ok: true, skipped: "outside_market_window" });
  }

  const apiKey = process.env.BURKUT_API_KEY;
  if (!apiKey) {
    error("BURKUT_API_KEY ortam değişkeni tanımlı değil.");
    return res.json({ ok: false, error: "missing_api_key" }, 500);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);
  const tablesDB = new TablesDB(client);

  const [held, existing] = await Promise.all([
    listHeldSymbols(tablesDB),
    listExistingPrices(tablesDB),
  ]);

  let json;
  try {
    json = await fetchProvider(apiKey);
  } catch (cause) {
    // Son geçerli fiyatları KORU; yalnızca portföydeki sembolleri "eski veri" olarak işaretle.
    const marked = await markStale(
      tablesDB,
      planStaleMarks({ existing, symbols: held }),
    );
    const retry = cause?.retryAfter
      ? ` (yeniden deneme: ${cause.retryAfter} sn)`
      : "";
    error(
      `${cause?.message ?? cause}${retry}. Eski veri işaretlenen: ${marked.succeeded}.`,
    );
    return res.json({
      ok: false,
      error: "provider_failed",
      status: cause?.status ?? null,
      markedStale: marked.succeeded,
    });
  }

  let parsed;
  try {
    parsed = parseBurkutResponse(json);
  } catch (cause) {
    const marked = await markStale(
      tablesDB,
      planStaleMarks({ existing, symbols: held }),
    );
    error(
      `${cause?.message ?? cause}. Eski veri işaretlenen: ${marked.succeeded}.`,
    );
    return res.json({
      ok: false,
      error: "invalid_response",
      markedStale: marked.succeeded,
    });
  }

  const fullRefresh = isEndOfDayRun(now) || existing.size === 0;
  const { writes, missingHeld } = planWrites({
    quotes: parsed.quotes,
    existing,
    held,
    fullRefresh,
  });

  const written = await runInChunks(writes, (write) =>
    writeRow(tablesDB, write),
  );
  const marked = await markStale(
    tablesDB,
    planStaleMarks({ existing, symbols: missingHeld }),
  );

  const summary = {
    ok: written.failures.length === 0,
    fullRefresh,
    received: parsed.quotes.length,
    invalid: parsed.invalidCount,
    held: held.size,
    written: written.succeeded,
    writeFailures: written.failures.length,
    missingHeld,
    markedStale: marked.succeeded,
  };

  log(
    `Alınan: ${summary.received} (geçersiz ${summary.invalid}) · portföydeki sembol: ${summary.held} · ` +
      `yazılan: ${summary.written} · tam yenileme: ${fullRefresh ? "evet" : "hayır"} · ` +
      `sağlayıcıda olmayan: ${missingHeld.join(", ") || "yok"}`,
  );
  if (written.failures.length > 0)
    error(`Yazılamayan satırlar: ${written.failures.slice(0, 10).join(" | ")}`);

  return res.json(summary);
};

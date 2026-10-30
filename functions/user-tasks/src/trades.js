/**
 * Alım/satım işlemleri: ekleme, düzenleme, silme.
 *
 * Kurallar (hepsi sunucuda, hesap motoruyla):
 *  - Alanlar validateTrade ile doğrulanır; 1 günden fazla ilerideki tarih reddedilir.
 *  - Sembol price_cache'te olmalıdır (bilinen BIST sembolü).
 *  - Kullanıcının TÜM işlemleri, değişiklik uygulanmış haliyle motordan tekrar geçirilir;
 *    herhangi bir anda eldekinden fazla satış oluşuyorsa istek reddedilir.
 *  - Satır yalnızca sahibinin OKUYABİLECEĞİ izinle yazılır; güncelleme/silme yalnızca bu yoldan.
 */
import { ID, Permission, Query, Role } from "node-appwrite";

import { DATABASE_ID } from "./constants.js";
import {
    computePositions,
    describeEngineError,
    normalizeSymbol,
    validateTrade,
} from "./vendor/portfolio.js";

const TRADES_TABLE_ID = "trades";
const PRICES_TABLE_ID = "price_cache";
const PAGE_SIZE = 100;
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/;
const FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

export class TradeRequestError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function rowToTrade(row) {
  return {
    id: row.$id,
    symbol: row.symbol,
    side: row.side,
    lots: row.lots,
    priceMinor: row.priceMinor,
    feeMinor: row.feeMinor ?? 0,
    date: row.date,
    createdAt: row.$createdAt,
  };
}

async function listUserTrades(tablesDB, userId) {
  const trades = [];
  let cursor;
  for (;;) {
    const queries = [Query.equal("userId", userId), Query.limit(PAGE_SIZE)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TRADES_TABLE_ID,
      queries,
    });
    trades.push(...result.rows.map(rowToTrade));
    const last = result.rows[result.rows.length - 1];
    if (result.rows.length < PAGE_SIZE || !last) return trades;
    cursor = last.$id;
  }
}

/** İstekteki işlem alanlarını doğrular ve normalleştirir. */
function parseTradeFields(raw) {
  if (!raw || typeof raw !== "object") {
    throw new TradeRequestError(400, "invalid_body", "İşlem bilgileri eksik.");
  }
  const fields = {
    symbol: typeof raw.symbol === "string" ? normalizeSymbol(raw.symbol) : "",
    side: raw.side,
    lots: raw.lots,
    priceMinor: raw.priceMinor,
    feeMinor: raw.feeMinor ?? 0,
    date: raw.date,
  };
  const reason = validateTrade({ id: "candidate", ...fields });
  if (reason) {
    throw new TradeRequestError(
      400,
      reason,
      describeEngineError({
        kind: "invalid_trade",
        tradeId: "candidate",
        reason,
      }),
    );
  }
  if (Date.parse(fields.date) > Date.now() + FUTURE_TOLERANCE_MS) {
    throw new TradeRequestError(
      400,
      "future_date",
      "İşlem tarihi ileri bir tarih olamaz.",
    );
  }
  return fields;
}

async function assertKnownSymbol(tablesDB, symbol) {
  try {
    await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: PRICES_TABLE_ID,
      rowId: symbol,
    });
  } catch (cause) {
    if (cause?.code === 404) {
      throw new TradeRequestError(
        422,
        "unknown_symbol",
        `${symbol} bilinen bir BIST sembolü değil.`,
      );
    }
    throw cause;
  }
}

/** Değişiklik uygulanmış işlem listesini motordan geçirir; kural ihlalinde 422. */
function assertConsistent(trades) {
  const result = computePositions(trades);
  if (!result.ok)
    throw new TradeRequestError(
      422,
      result.error.kind,
      describeEngineError(result.error),
    );
}

function findOwnTrade(trades, id) {
  const trade =
    typeof id === "string" ? trades.find((item) => item.id === id) : undefined;
  if (!trade)
    throw new TradeRequestError(404, "not_found", "İşlem bulunamadı.");
  return trade;
}

export async function handleTradeRequest({ tablesDB, userId, body }) {
  const action = body?.action;
  const existing = await listUserTrades(tablesDB, userId);

  if (action === "create") {
    const fields = parseTradeFields(body.trade);
    const id =
      typeof body.id === "string" && ID_PATTERN.test(body.id)
        ? body.id
        : ID.unique();

    // Aynı ID ile tekrar gelen istek (ör. ağ kopup yeniden denendi): mevcut kaydı döndür.
    const already = existing.find((trade) => trade.id === id);
    if (already) return { trade: already, created: false };

    await assertKnownSymbol(tablesDB, fields.symbol);
    // Yeni işlemin kayıt zamanı yok: motor onu aynı tarihli işlemlerin SONUNA koyar.
    assertConsistent([...existing, { id, ...fields }]);

    try {
      const row = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: TRADES_TABLE_ID,
        rowId: id,
        data: { userId, ...fields },
        permissions: [Permission.read(Role.user(userId))],
      });
      return { trade: rowToTrade(row), created: true };
    } catch (cause) {
      // ID başka bir kullanıcının işlemine ait.
      if (cause?.code === 409)
        throw new TradeRequestError(
          409,
          "id_conflict",
          "İşlem kimliği kullanılıyor.",
        );
      throw cause;
    }
  }

  if (action === "update") {
    const current = findOwnTrade(existing, body.id);
    const fields = parseTradeFields(body.trade);
    if (fields.symbol !== current.symbol)
      await assertKnownSymbol(tablesDB, fields.symbol);
    assertConsistent(
      existing.map((trade) =>
        trade.id === current.id ? { ...trade, ...fields } : trade,
      ),
    );

    const row = await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: TRADES_TABLE_ID,
      rowId: current.id,
      data: fields,
    });
    return { trade: rowToTrade(row) };
  }

  if (action === "delete") {
    const current = findOwnTrade(existing, body.id);
    assertConsistent(existing.filter((trade) => trade.id !== current.id));
    await tablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TRADES_TABLE_ID,
      rowId: current.id,
    });
    return { deleted: true };
  }

  throw new TradeRequestError(400, "invalid_action", "Geçersiz işlem türü.");
}

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Channel, type RealtimeSubscription } from "react-native-appwrite";

import { realtime } from "@/lib/appwrite/client";
import {
    onRealtimeReconnect,
    useRealtimeStatus,
    type RealtimeStatus,
} from "@/lib/appwrite/realtimeStatus";
import { DATABASE_ID, TABLES } from "@/lib/appwrite/schema";

import { priceKeys } from "./hooks";
import { upsertQuote } from "./quoteCache";
import { parseQuoteRow, type Quote } from "./schemas";

/**
 * price_cache tablosunu Realtime ile dinler; gelen fiyatı önbelleğe doğrudan yazar.
 * - Silme olayında ve bağlantı YENİDEN kurulduğunda fiyatlar sunucudan baştan çekilir
 *   (kopukken gelen olaylar kaçırılmış olabilir).
 * - Bileşen kaldırılınca abonelik kapanır; son abonelikse bağlantı da kapanır (ör. çıkışta).
 * Dönen değer: bağlantı durumu (ekrandaki "Canlı" göstergesi için).
 */
export function useLivePrices(): RealtimeStatus {
  const queryClient = useQueryClient();

  useEffect(() => {
    let subscription: RealtimeSubscription | null = null;
    let cancelled = false;

    const refetchPrices = () =>
      void queryClient.invalidateQueries({ queryKey: priceKeys.all });

    realtime
      .subscribe(
        Channel.tablesdb(DATABASE_ID).table(TABLES.priceCache).row(),
        (event) => {
          if (event.events.some((name) => name.endsWith(".delete"))) {
            refetchPrices();
            return;
          }
          const quote = parseQuoteRow(event.payload);
          if (!quote) return;
          queryClient.setQueriesData<readonly Quote[]>(
            { queryKey: priceKeys.quotesAll },
            (current) => (current ? upsertQuote(current, quote) : current),
          );
        },
      )
      .then((created) => {
        if (cancelled) void created.close();
        else subscription = created;
      })
      .catch(() => {
        // Abonelik kurulamadı: durum göstergesi "yeniden kuruluyor" kalır; sekmeye dönüşte fiyatlar yine yenilenir.
      });

    const stopListening = onRealtimeReconnect(refetchPrices);

    return () => {
      cancelled = true;
      stopListening();
      void subscription?.close();
    };
  }, [queryClient]);

  return useRealtimeStatus();
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUserId } from "@/features/auth/useCurrentUserId";

import {
    createCategory,
    deleteCategory,
    fetchCategories,
    updateCategory,
} from "./api";
import { removeCategory, upsertCategory } from "./cache";
import type { Category, CategoryInput, CategoryUpdate } from "./schemas";

export const categoryKeys = {
  all: (userId: string) => ["categories", userId] as const,
};

export function useCategories() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: categoryKeys.all(userId),
    queryFn: () => fetchCategories(userId),
    staleTime: 5 * 60_000,
  });
}

type Snapshot = { previous: Category[] | undefined };

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const key = categoryKeys.all(userId);

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      createCategory({ userId, id, input }),
    onMutate: async ({ id, input }): Promise<Snapshot> => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Category[]>(key);
      if (previous)
        queryClient.setQueryData(
          key,
          upsertCategory(previous, { id, ...input }),
        );
      return { previous };
    },
    onError: (_error, _variables, snapshot) => {
      if (snapshot?.previous) queryClient.setQueryData(key, snapshot.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const key = categoryKeys.all(userId);

  return useMutation({
    mutationFn: ({
      previous,
      input,
    }: {
      previous: Category;
      input: CategoryUpdate;
    }) => updateCategory({ id: previous.id, input }),
    onMutate: async ({ previous: category, input }): Promise<Snapshot> => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Category[]>(key);
      if (previous)
        queryClient.setQueryData(
          key,
          upsertCategory(previous, { ...category, ...input }),
        );
      return { previous };
    },
    onError: (_error, _variables, snapshot) => {
      if (snapshot?.previous) queryClient.setQueryData(key, snapshot.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/** Optimistic DEĞİL: sunucu bağlı işlem kontrolü yapar; başarılı olunca listeden kaldırılır. */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const key = categoryKeys.all(userId);

  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteCategory({ userId, id }),
    onSuccess: (_result, { id }) => {
      const current = queryClient.getQueryData<Category[]>(key);
      if (current) queryClient.setQueryData(key, removeCategory(current, id));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

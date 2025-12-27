import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export const useProductCategories = () => {
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["product_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as ProductCategory[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { data: result, error } = await supabase
        .from("product_categories")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
      toast({ title: "Category created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating category", description: error.message, variant: "destructive" });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; description?: string }) => {
      const { data: result, error } = await supabase
        .from("product_categories")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
      toast({ title: "Category updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating category", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
      toast({ title: "Category deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting category", description: error.message, variant: "destructive" });
    },
  });

  return {
    categories: categories || [],
    isLoading,
    createCategory: createCategory.mutateAsync,
    isCreating: createCategory.isPending,
    updateCategory: updateCategory.mutateAsync,
    isUpdating: updateCategory.isPending,
    deleteCategory: deleteCategory.mutateAsync,
    isDeleting: deleteCategory.isPending,
  };
};

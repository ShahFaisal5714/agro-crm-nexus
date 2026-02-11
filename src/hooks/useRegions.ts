import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Region {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
}

export const useRegions = () => {
  const queryClient = useQueryClient();

  const { data: regions = [], isLoading } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regions")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Region[];
    },
  });

  const createRegion = useMutation({
    mutationFn: async (regionData: { name: string; code: string; description?: string }) => {
      const { error } = await supabase.from("regions").insert(regionData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      toast.success("Region created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create region: ${error.message}`);
    },
  });

  const updateRegion = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; code?: string; description?: string }) => {
      const { error } = await supabase.from("regions").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      toast.success("Region updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update region: ${error.message}`);
    },
  });

  const deleteRegion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("regions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      queryClient.invalidateQueries({ queryKey: ["territories"] });
      toast.success("Region deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete region: ${error.message}`);
    },
  });

  return {
    regions,
    isLoading,
    createRegion: createRegion.mutateAsync,
    updateRegion: updateRegion.mutateAsync,
    deleteRegion: deleteRegion.mutateAsync,
    isCreating: createRegion.isPending,
  };
};

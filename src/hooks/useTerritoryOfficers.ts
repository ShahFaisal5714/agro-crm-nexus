import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TerritoryOfficer {
  id: string;
  officer_name: string;
  phone?: string | null;
  territory_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const useTerritoryOfficers = () => {
  const queryClient = useQueryClient();

  const { data: officers = [], isLoading } = useQuery({
    queryKey: ["territory-officers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_officers")
        .select("*")
        .order("officer_name");
      if (error) throw error;
      return data as TerritoryOfficer[];
    },
  });

  const addOfficer = useMutation({
    mutationFn: async (officer: { officer_name: string; phone?: string; territory_id?: string }) => {
      const { data, error } = await supabase
        .from("territory_officers")
        .insert(officer)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["territory-officers"] });
      toast.success("Territory Sales Officer added successfully");
    },
    onError: (error: Error) => {
      if (error.message?.includes("territory_officers_territory_id_key")) {
        toast.error("This territory already has a sales officer assigned");
      } else {
        toast.error(`Failed to add officer: ${error.message}`);
      }
    },
  });

  const updateOfficer = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; officer_name?: string; phone?: string | null; territory_id?: string | null }) => {
      const { error } = await supabase
        .from("territory_officers")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["territory-officers"] });
      toast.success("Territory Sales Officer updated successfully");
    },
    onError: (error: Error) => {
      if (error.message?.includes("territory_officers_territory_id_key")) {
        toast.error("This territory already has a sales officer assigned");
      } else {
        toast.error(`Failed to update officer: ${error.message}`);
      }
    },
  });

  const deleteOfficer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("territory_officers")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["territory-officers"] });
      toast.success("Territory Sales Officer deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete officer: ${error.message}`);
    },
  });

  return {
    officers,
    isLoading,
    addOfficer: addOfficer.mutateAsync,
    updateOfficer: updateOfficer.mutateAsync,
    deleteOfficer: deleteOfficer.mutateAsync,
    isAdding: addOfficer.isPending,
    isUpdating: updateOfficer.isPending,
    isDeleting: deleteOfficer.isPending,
  };
};

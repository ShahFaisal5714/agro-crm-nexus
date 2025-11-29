import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Dealer {
  id: string;
  dealer_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  gst_number?: string;
}

export const useDealers = () => {
  const { data: dealers, isLoading } = useQuery({
    queryKey: ["dealers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealers")
        .select("*")
        .order("dealer_name");

      if (error) throw error;
      return data as Dealer[];
    },
  });

  return {
    dealers: dealers || [],
    isLoading,
  };
};

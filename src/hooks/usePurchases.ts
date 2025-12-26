import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  purchase_date: string;
  total_amount: number;
  status: string;
  notes?: string;
  created_at: string;
  created_by: string;
  suppliers?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    gst_number?: string;
  };
}

export interface PurchaseItem {
  id?: string;
  purchase_id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PurchaseItemWithProduct extends PurchaseItem {
  products?: {
    name: string;
    sku: string;
  };
}

export const usePurchases = () => {
  const queryClient = useQueryClient();

  const { data: purchases, isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select(`
          *,
          suppliers (name, address, phone, email, gst_number)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Purchase[];
    },
  });

  const getPurchaseWithItems = async (purchaseId: string) => {
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .select(`
        *,
        suppliers (name, address, phone, email, gst_number)
      `)
      .eq("id", purchaseId)
      .single();

    if (purchaseError) throw purchaseError;

    const { data: items, error: itemsError } = await supabase
      .from("purchase_items")
      .select(`
        *,
        products (name, sku)
      `)
      .eq("purchase_id", purchaseId);

    if (itemsError) throw itemsError;

    return { purchase: purchase as Purchase, items: items as PurchaseItemWithProduct[] };
  };

  const createPurchase = useMutation({
    mutationFn: async (purchaseData: {
      supplier_id: string;
      purchase_date: string;
      notes?: string;
      items: PurchaseItem[];
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: purchaseNumber, error: rpcError } = await supabase.rpc(
        "generate_purchase_number"
      );
      if (rpcError) throw rpcError;

      const total_amount = purchaseData.items.reduce(
        (sum, item) => sum + item.total,
        0
      );

      const { data: purchase, error: purchaseError } = await supabase
        .from("purchases")
        .insert({
          purchase_number: purchaseNumber,
          supplier_id: purchaseData.supplier_id,
          purchase_date: purchaseData.purchase_date,
          total_amount,
          notes: purchaseData.notes,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      const items = purchaseData.items.map((item) => ({
        purchase_id: purchase.id,
        ...item,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_items")
        .insert(items);

      if (itemsError) throw itemsError;

      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Purchase order created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create purchase order");
      console.error(error);
    },
  });

  const updatePurchase = useMutation({
    mutationFn: async ({
      id,
      supplier_id,
      purchase_date,
      status,
      notes,
    }: {
      id: string;
      supplier_id: string;
      purchase_date: string;
      status: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("purchases")
        .update({
          supplier_id,
          purchase_date,
          status,
          notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Purchase order updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update purchase order");
      console.error(error);
    },
  });

  const deletePurchase = useMutation({
    mutationFn: async (purchaseId: string) => {
      // First delete purchase items
      const { error: itemsError } = await supabase
        .from("purchase_items")
        .delete()
        .eq("purchase_id", purchaseId);

      if (itemsError) throw itemsError;

      // Then delete the purchase
      const { error } = await supabase
        .from("purchases")
        .delete()
        .eq("id", purchaseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Purchase order deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete purchase order");
      console.error(error);
    },
  });

  return {
    purchases: purchases || [],
    isLoading,
    getPurchaseWithItems,
    createPurchase: createPurchase.mutateAsync,
    updatePurchase: updatePurchase.mutateAsync,
    isUpdating: updatePurchase.isPending,
    deletePurchase: deletePurchase.mutateAsync,
  };
};

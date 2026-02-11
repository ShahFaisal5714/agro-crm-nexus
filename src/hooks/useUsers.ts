import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'territory_sales_manager' | 'dealer' | 'finance' | 'accountant' | 'employee';
  territory?: string;
}

export const useUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");

      if (error) throw error;
      return data as UserRole[];
    },
  });

  const createUser = useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
      phone,
      role,
      territory,
    }: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      role: 'admin' | 'territory_sales_manager' | 'dealer' | 'finance' | 'accountant' | 'employee';
      territory?: string;
    }) => {
      // Call the secure edge function instead of client-side admin API
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email, password, fullName, phone, role, territory },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create user');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    users,
    userRoles,
    isLoading,
    createUser: createUser.mutateAsync,
    isCreating: createUser.isPending,
  };
};

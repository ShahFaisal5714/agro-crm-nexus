import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";

export interface CreditRecoveryData {
  // Dealer level data
  dealer_id: string;
  dealer_name: string;
  territory_id: string | null;
  territory_name: string;
  
  // Aggregated amounts
  total_credit: number;
  total_recovered: number;
  remaining: number;
  recovery_rate: number;
  
  // Payment details for drill-down
  payments: {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    created_by: string;
    sales_officer_name: string;
  }[];
}

export interface TerritoryRecoveryData {
  territory_id: string;
  territory_name: string;
  total_credit: number;
  total_recovered: number;
  remaining: number;
  recovery_rate: number;
  dealer_count: number;
}

export interface SalesOfficerRecoveryData {
  officer_id: string;
  officer_name: string;
  total_recovered: number;
  payment_count: number;
}

interface UseCreditRecoveryProps {
  dateFrom?: Date;
  dateTo?: Date;
}

export const useCreditRecovery = ({ dateFrom, dateTo }: UseCreditRecoveryProps = {}) => {
  // Fetch dealer credits
  const { data: credits = [], isLoading: creditsLoading } = useQuery({
    queryKey: ["credit-recovery-credits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_credits")
        .select(`
          id,
          dealer_id,
          amount,
          credit_date,
          created_by
        `)
        .order("credit_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch dealer payments with creator info
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["credit-recovery-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_payments")
        .select(`
          id,
          dealer_id,
          amount,
          payment_date,
          payment_method,
          created_by
        `)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch dealers with territory info
  const { data: dealers = [], isLoading: dealersLoading } = useQuery({
    queryKey: ["credit-recovery-dealers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealers")
        .select("id, dealer_name, territory_id");

      if (error) throw error;
      return data;
    },
  });

  // Fetch territories
  const { data: territories = [], isLoading: territoriesLoading } = useQuery({
    queryKey: ["credit-recovery-territories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territories")
        .select("id, name, code");

      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles (sales officers)
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["credit-recovery-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (error) throw error;
      return data;
    },
  });

  const isLoading = creditsLoading || paymentsLoading || dealersLoading || territoriesLoading || profilesLoading;

  // Filter payments by date range
  const filteredPayments = useMemo(() => {
    if (!dateFrom || !dateTo) return payments;
    return payments.filter(p => {
      const paymentDate = new Date(p.payment_date);
      return isWithinInterval(paymentDate, {
        start: startOfDay(dateFrom),
        end: endOfDay(dateTo),
      });
    });
  }, [payments, dateFrom, dateTo]);

  // Filter credits by date range (for context, though we typically show all-time credit)
  const filteredCredits = useMemo(() => {
    if (!dateFrom || !dateTo) return credits;
    return credits.filter(c => {
      const creditDate = new Date(c.credit_date);
      return isWithinInterval(creditDate, {
        start: startOfDay(dateFrom),
        end: endOfDay(dateTo),
      });
    });
  }, [credits, dateFrom, dateTo]);

  // Calculate dealer-level recovery data
  const dealerRecoveryData: CreditRecoveryData[] = useMemo(() => {
    return dealers.map(dealer => {
      const dealerCredits = credits.filter(c => c.dealer_id === dealer.id);
      const dealerPayments = filteredPayments.filter(p => p.dealer_id === dealer.id);
      
      const territory = territories.find(t => t.id === dealer.territory_id);
      
      const total_credit = dealerCredits.reduce((sum, c) => sum + Number(c.amount), 0);
      const total_recovered = dealerPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = total_credit - dealerPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      
      // For remaining calculation, we need all payments, not just filtered
      const allDealerPayments = payments.filter(p => p.dealer_id === dealer.id);
      const totalPaidAllTime = allDealerPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const actualRemaining = total_credit - totalPaidAllTime;
      
      const recovery_rate = total_credit > 0 ? (total_recovered / total_credit) * 100 : 0;
      
      return {
        dealer_id: dealer.id,
        dealer_name: dealer.dealer_name,
        territory_id: dealer.territory_id,
        territory_name: territory?.name || "Unassigned",
        total_credit,
        total_recovered,
        remaining: actualRemaining,
        recovery_rate,
        payments: dealerPayments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          payment_date: p.payment_date,
          payment_method: p.payment_method,
          created_by: p.created_by,
          sales_officer_name: profiles.find(pr => pr.id === p.created_by)?.full_name || "Unknown",
        })),
      };
    }).filter(d => d.total_credit > 0 || d.total_recovered > 0);
  }, [dealers, credits, filteredPayments, payments, territories, profiles]);

  // Calculate territory-level recovery data
  const territoryRecoveryData: TerritoryRecoveryData[] = useMemo(() => {
    const territoryMap = new Map<string, TerritoryRecoveryData>();
    
    dealerRecoveryData.forEach(dealer => {
      const key = dealer.territory_id || "unassigned";
      const existing = territoryMap.get(key) || {
        territory_id: dealer.territory_id || "unassigned",
        territory_name: dealer.territory_name,
        total_credit: 0,
        total_recovered: 0,
        remaining: 0,
        recovery_rate: 0,
        dealer_count: 0,
      };
      
      existing.total_credit += dealer.total_credit;
      existing.total_recovered += dealer.total_recovered;
      existing.remaining += dealer.remaining;
      existing.dealer_count += 1;
      
      territoryMap.set(key, existing);
    });
    
    return Array.from(territoryMap.values()).map(t => ({
      ...t,
      recovery_rate: t.total_credit > 0 ? (t.total_recovered / t.total_credit) * 100 : 0,
    })).sort((a, b) => b.total_recovered - a.total_recovered);
  }, [dealerRecoveryData]);

  // Calculate sales officer recovery data
  const salesOfficerRecoveryData: SalesOfficerRecoveryData[] = useMemo(() => {
    const officerMap = new Map<string, SalesOfficerRecoveryData>();
    
    filteredPayments.forEach(payment => {
      const officer = profiles.find(p => p.id === payment.created_by);
      const key = payment.created_by;
      const existing = officerMap.get(key) || {
        officer_id: payment.created_by,
        officer_name: officer?.full_name || "Unknown",
        total_recovered: 0,
        payment_count: 0,
      };
      
      existing.total_recovered += Number(payment.amount);
      existing.payment_count += 1;
      
      officerMap.set(key, existing);
    });
    
    return Array.from(officerMap.values()).sort((a, b) => b.total_recovered - a.total_recovered);
  }, [filteredPayments, profiles]);

  // Summary statistics
  const summary = useMemo(() => {
    const totalCredit = dealerRecoveryData.reduce((sum, d) => sum + d.total_credit, 0);
    const totalRecovered = dealerRecoveryData.reduce((sum, d) => sum + d.total_recovered, 0);
    const totalRemaining = dealerRecoveryData.reduce((sum, d) => sum + d.remaining, 0);
    const overallRecoveryRate = totalCredit > 0 ? (totalRecovered / totalCredit) * 100 : 0;
    
    return {
      totalCredit,
      totalRecovered,
      totalRemaining,
      overallRecoveryRate,
      dealerCount: dealerRecoveryData.length,
      territoryCount: territoryRecoveryData.length,
      officerCount: salesOfficerRecoveryData.length,
    };
  }, [dealerRecoveryData, territoryRecoveryData, salesOfficerRecoveryData]);

  return {
    isLoading,
    dealerRecoveryData,
    territoryRecoveryData,
    salesOfficerRecoveryData,
    summary,
    territories,
    profiles,
  };
};

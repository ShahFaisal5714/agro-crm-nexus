import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: string;
  title: string;
  subtitle: string;
  href: string;
}

export const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const searchData = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const searchResults: SearchResult[] = [];
    const q = `%${searchQuery}%`;

    try {
      const [dealers, products, invoices, salesOrders, policies, suppliers] = await Promise.all([
        supabase.from("dealers").select("id, dealer_name, contact_person, phone").ilike("dealer_name", q).limit(5),
        supabase.from("products").select("id, name, sku").or(`name.ilike.${q},sku.ilike.${q}`).limit(5),
        supabase.from("invoices").select("id, invoice_number, total_amount").ilike("invoice_number", q).limit(5),
        supabase.from("sales_orders").select("id, order_number, total_amount").ilike("order_number", q).limit(5),
        supabase.from("policies").select("id, policy_number, name").or(`policy_number.ilike.${q},name.ilike.${q}`).limit(5),
        supabase.from("suppliers").select("id, name, phone").ilike("name", q).limit(5),
      ]);

      dealers.data?.forEach((d) => searchResults.push({
        type: "Dealer", title: d.dealer_name, subtitle: d.contact_person || d.phone || "", href: "/dealers",
      }));
      products.data?.forEach((p) => searchResults.push({
        type: "Product", title: p.name, subtitle: `Batch: ${p.sku}`, href: "/inventory",
      }));
      invoices.data?.forEach((i) => searchResults.push({
        type: "Invoice", title: i.invoice_number, subtitle: `₹${i.total_amount}`, href: "/invoices",
      }));
      salesOrders.data?.forEach((s) => searchResults.push({
        type: "Sales Order", title: s.order_number, subtitle: `₹${s.total_amount}`, href: "/sales",
      }));
      policies.data?.forEach((p) => searchResults.push({
        type: "Policy", title: p.policy_number, subtitle: p.name || "", href: "/policies",
      }));
      suppliers.data?.forEach((s) => searchResults.push({
        type: "Supplier", title: s.name, subtitle: s.phone || "", href: "/purchase",
      }));
    } catch (err) {
      console.error("Search error:", err);
    }

    setResults(searchResults);
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchData(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchData]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.href);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search... (Ctrl+K)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-9 pr-8 w-[280px]"
        />
        {query && (
          <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => { setQuery(""); setResults([]); }}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isOpen && (query.length >= 2) && (
        <div className="absolute top-full mt-1 w-[400px] right-0 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No results found</div>
          ) : (
            results.map((result, i) => (
              <button
                key={`${result.type}-${i}`}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-accent flex items-center justify-between",
                  i !== results.length - 1 && "border-b border-border"
                )}
                onClick={() => handleSelect(result)}
              >
                <div>
                  <p className="text-sm font-medium">{result.title}</p>
                  <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                </div>
                <span className="text-xs bg-muted px-2 py-1 rounded">{result.type}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

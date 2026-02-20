import { useState, useRef, useEffect } from "react";
import { Search, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/hooks/useProducts";

interface ProductSearchSelectProps {
  products: Product[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  showStock?: boolean;
}

export const ProductSearchSelect = ({
  products,
  value,
  onValueChange,
  placeholder = "Select product",
  showStock = false,
}: ProductSearchSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find((p) => p.id === value);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (productId: string) => {
    onValueChange(productId);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          !selectedProduct && "text-muted-foreground"
        )}
      >
        <span className="truncate">
          {selectedProduct
            ? `${selectedProduct.name} (${selectedProduct.sku})`
            : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or batch..."
              className="flex h-10 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No products found
              </div>
            ) : (
              filtered.map((product) => {
                const isLowStock = showStock && product.stock_quantity > 0 && product.stock_quantity < 50;
                const isOutOfStock = showStock && product.stock_quantity <= 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelect(product.id)}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      value === product.id && "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === product.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                      <span className="truncate">
                        {product.name} — Batch: {product.sku}{product.pack_size ? ` — Pack: ${product.pack_size}` : ""}
                      </span>
                      {showStock && (
                        isOutOfStock ? (
                          <Badge variant="destructive" className="text-xs shrink-0">Out</Badge>
                        ) : isLowStock ? (
                          <Badge variant="outline" className="text-xs shrink-0 text-warning border-warning">
                            Low: {product.stock_quantity}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0">
                            Stock: {product.stock_quantity}
                          </span>
                        )
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

interface ReportFiltersProps {
  territories?: { id: string; name: string; code: string }[];
  officers?: { id: string; full_name: string }[];
  categories?: { id: string; name: string }[];
  selectedTerritory?: string;
  selectedOfficer?: string;
  selectedCategory?: string;
  onTerritoryChange?: (value: string) => void;
  onOfficerChange?: (value: string) => void;
  onCategoryChange?: (value: string) => void;
  showTerritory?: boolean;
  showOfficer?: boolean;
  showCategory?: boolean;
}

export const ReportFilters = ({
  territories = [],
  officers = [],
  categories = [],
  selectedTerritory = "all",
  selectedOfficer = "all",
  selectedCategory = "all",
  onTerritoryChange,
  onOfficerChange,
  onCategoryChange,
  showTerritory = true,
  showOfficer = true,
  showCategory = true,
}: ReportFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg border">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground mr-1">Filter by:</span>

      {showTerritory && onTerritoryChange && (
        <Select value={selectedTerritory} onValueChange={onTerritoryChange}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder="All Territories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Territories</SelectItem>
            {territories.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} ({t.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showOfficer && onOfficerChange && (
        <Select value={selectedOfficer} onValueChange={onOfficerChange}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder="All Officers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sales Managers</SelectItem>
            {officers.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showCategory && onCategoryChange && (
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

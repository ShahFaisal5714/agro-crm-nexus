import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupplierRatingStarsProps {
  rating: number | null | undefined;
  onChange?: (rating: number) => void;
  size?: "sm" | "md";
  label?: string;
  readOnly?: boolean;
}

export const SupplierRatingStars = ({ rating, onChange, size = "md", label, readOnly = false }: SupplierRatingStarsProps) => {
  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            className={cn(
              "transition-colors",
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
            )}
          >
            <Star
              className={cn(
                starSize,
                star <= (rating || 0)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

import { toast } from "sonner";

// Map database error codes to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  "23505": "This record already exists",
  "23503": "Cannot complete operation due to related records",
  "23502": "Required information is missing",
  "42501": "You don't have permission to perform this action",
  "PGRST116": "Record not found",
  "PGRST301": "Connection error. Please try again",
};

interface DatabaseError {
  code?: string;
  message?: string;
  details?: string;
}

/**
 * Handle database errors securely by logging details server-side
 * and showing user-friendly messages to the client
 */
export const handleDatabaseError = (
  error: DatabaseError | Error | unknown,
  context?: string
): void => {
  // Log detailed error for debugging (only visible in browser console during development)
  console.error(`Database operation failed${context ? ` (${context})` : ""}:`, error);

  // Extract error code if available
  const errorCode = (error as DatabaseError)?.code;
  
  // Get user-friendly message
  let userMessage = "Unable to complete operation. Please try again.";
  
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    userMessage = ERROR_MESSAGES[errorCode];
  }

  toast.error(userMessage);
};

/**
 * Handle generic operation errors with a custom fallback message
 */
export const handleOperationError = (
  error: Error | unknown,
  fallbackMessage: string = "Operation failed. Please try again."
): void => {
  console.error("Operation failed:", error);
  toast.error(fallbackMessage);
};

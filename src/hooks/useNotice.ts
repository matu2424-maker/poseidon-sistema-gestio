import { useCallback, useState } from "react";

export function useNotice(initialMessage = "") {
  const [message, setMessageState] = useState(initialMessage);
  const setMessage = useCallback((nextMessage: string) => setMessageState(nextMessage), []);
  const clearMessage = useCallback(() => setMessageState(""), []);

  return { message, setMessage, clearMessage };
}

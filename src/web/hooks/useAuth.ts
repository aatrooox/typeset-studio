import { useEffect, useState } from "react";

const STORAGE_KEY = "typeset_studio_admin_key";

export function useAuth() {
  const [adminKey, setAdminKeyState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || "";
  });
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyKey = async (key: string): Promise<boolean> => {
    if (!key) {
      setIsVerified(false);
      return false;
    }
    setIsVerifying(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      const valid = Boolean(data.ok);
      setIsVerified(valid);
      return valid;
    } catch {
      setIsVerified(false);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const setAdminKey = (newKey: string) => {
    localStorage.setItem(STORAGE_KEY, newKey);
    setAdminKeyState(newKey);
    verifyKey(newKey);
  };

  useEffect(() => {
    if (adminKey) {
      verifyKey(adminKey);
    } else {
      setIsVerified(false);
    }
  }, []);

  return {
    adminKey,
    setAdminKey,
    isVerified,
    isVerifying,
    verifyKey,
  };
}

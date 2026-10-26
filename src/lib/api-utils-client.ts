"use client";

// Small client-side fetch helper: returns parsed JSON, throws Error with the
// server's Taglish message on non-2xx responses.
export async function apiJson<T = unknown>(
  url: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...init } = options ?? {};
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(url, { ...init, headers }).catch(() => {
    // Network failure / server down / offline — browsers throw a raw English
    // "Failed to fetch" error that confuses non-techy users. Translate it.
    throw new Error(
      "Walang koneksyon sa server. Pakicheck ang internet o Wi-Fi mo, tapos pakisubok muli."
    );
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : null) || "May naganap na error sa server. Pakisubok muli.";
    throw new Error(message);
  }
  return data as T;
}

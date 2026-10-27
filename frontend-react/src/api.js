const BASE = import.meta.env.DEV
  ? "http://127.0.0.1:8000"
  : "";

async function call(path, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(BASE + path, {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
      signal: ctrl.signal,
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();

    if (
      typeof data === "string" &&
      /not found|no product/i.test(data)
    ) {
      throw new Error("Product not found");
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  list: () => call("/products"),

  create: (p) =>
    call("/products", {
      method: "POST",
      body: JSON.stringify(p),
    }),

  update: (id, p) =>
    call(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(p),
    }),

  remove: (id) =>
    call(`/products/${id}`, {
      method: "DELETE",
    }),
};
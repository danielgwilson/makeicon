import { describe, expect, it, vi } from "vitest";

import { fetchJson } from "@/lib/http";

describe("fetchJson", () => {
  it("returns parsed JSON (mocked fetch)", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }));

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchJson<{ ok: boolean }>("https://example.com/data");
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

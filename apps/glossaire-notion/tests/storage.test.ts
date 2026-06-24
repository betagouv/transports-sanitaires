import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlossaryEntry } from "../src/notion";

const fetchGlossary = vi.fn<() => Promise<GlossaryEntry[]>>();
vi.mock("../src/notion", () => ({ fetchGlossary }));

type StoredRecord = Record<string, unknown>;
let store: StoredRecord = {};

vi.mock("webextension-polyfill", () => ({
  default: {
    storage: {
      local: {
        get: vi.fn((key: string) => Promise.resolve({ [key]: store[key] })),
        set: vi.fn((items: StoredRecord) => {
          store = { ...store, ...items };
          return Promise.resolve();
        }),
      },
    },
  },
}));

const { getOrFetchGlossary } = await import("../src/storage");

const sampleEntries: GlossaryEntry[] = [{ id: "1", terme: "ALD", definition: "Affection de Longue Durée" }];

beforeEach(() => {
  store = {};
  fetchGlossary.mockReset();
  fetchGlossary.mockResolvedValue(sampleEntries);
});

describe("getOrFetchGlossary", () => {
  it("fetches and caches the glossary when there is nothing cached", async () => {
    const result = await getOrFetchGlossary();

    expect(fetchGlossary).toHaveBeenCalledTimes(1);
    expect(result.entries).toEqual(sampleEntries);
  });

  it("reuses the cache when it is still fresh", async () => {
    await getOrFetchGlossary();
    fetchGlossary.mockClear();

    const result = await getOrFetchGlossary();

    expect(fetchGlossary).not.toHaveBeenCalled();
    expect(result.entries).toEqual(sampleEntries);
  });

  it("refetches when the cache is older than the TTL", async () => {
    await getOrFetchGlossary();
    const cacheKey = Object.keys(store)[0];
    const cached = store[cacheKey] as { entries: GlossaryEntry[]; fetchedAt: number };
    store[cacheKey] = { ...cached, fetchedAt: cached.fetchedAt - 2 * 60 * 60 * 1000 };
    fetchGlossary.mockClear();

    await getOrFetchGlossary();

    expect(fetchGlossary).toHaveBeenCalledTimes(1);
  });

  it("refetches when forceRefresh is true even if the cache is fresh", async () => {
    await getOrFetchGlossary();
    fetchGlossary.mockClear();

    await getOrFetchGlossary({ forceRefresh: true });

    expect(fetchGlossary).toHaveBeenCalledTimes(1);
  });
});

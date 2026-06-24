import browser from "webextension-polyfill";
import { fetchGlossary, type GlossaryEntry } from "./notion";

const CACHE_KEY = "glossary-cache";
const CACHE_TTL_MS = 60 * 60 * 1000;

export interface CachedGlossary {
  entries: GlossaryEntry[];
  fetchedAt: number;
}

async function readCache(): Promise<CachedGlossary | undefined> {
  const stored = await browser.storage.local.get(CACHE_KEY);
  return stored[CACHE_KEY] as CachedGlossary | undefined;
}

async function writeCache(cache: CachedGlossary): Promise<void> {
  await browser.storage.local.set({ [CACHE_KEY]: cache });
}

export async function getOrFetchGlossary({
  forceRefresh = false,
}: { forceRefresh?: boolean } = {}): Promise<CachedGlossary> {
  if (!forceRefresh) {
    const cached = await readCache();
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached;
    }
  }

  const entries = await fetchGlossary();
  const fresh: CachedGlossary = { entries, fetchedAt: Date.now() };
  await writeCache(fresh);
  return fresh;
}

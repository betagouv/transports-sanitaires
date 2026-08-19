// The popup itself: a search box over the cached glossary, with a manual
// refresh and the three states the cache can be in.

import { useEffect, useMemo, useRef, useState } from "react";
import { GLOSSARY_EDIT_URL, type GlossaryEntry } from "../notion";
import { searchGlossary } from "../search";
import { getOrFetchGlossary } from "../storage";

type Status = "loading" | "ready" | "error";

export function Popup() {
  const glossary = useGlossary();
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extension popups don't reliably honor the `autoFocus` HTML attribute, so focus imperatively.
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const results = useMemo(
    () => searchGlossary(glossary.entries, query),
    [glossary.entries, query],
  );

  return (
    <main className="popup">
      <Header onRefresh={glossary.refresh} refreshing={glossary.refreshing} />

      <input
        ref={searchInputRef}
        type="search"
        placeholder="Rechercher un terme…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {glossary.status === "loading" && (
        <p className="popup-message">Chargement du glossaire…</p>
      )}

      {glossary.status === "error" && <LoadFailed onRetry={glossary.retry} />}

      {glossary.status === "ready" && (
        <>
          <Results results={results} query={query} />
          <LastUpdated fetchedAt={glossary.fetchedAt} />
        </>
      )}
    </main>
  );
}

// ---- implementation ----

/** The cached glossary, plus the two ways the popup can ask for it again. */
function useGlossary() {
  const [status, setStatus] = useState<Status>("loading");
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number>();
  const [refreshing, setRefreshing] = useState(false);

  const load = async (forceRefresh: boolean) => {
    try {
      const cache = await getOrFetchGlossary({ forceRefresh });
      setEntries(cache.entries);
      setFetchedAt(cache.fetchedAt);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: chargement au montage, une seule fois — `load` ne dépend d'aucun état.
  useEffect(() => {
    load(false);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  return {
    status,
    entries,
    fetchedAt,
    refreshing,
    refresh,
    retry: () => load(false),
  };
}

function Header({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <header className="popup-header">
      <h1>Glossaire transports sanitaires</h1>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Actualiser"
      >
        ⟳
      </button>
    </header>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="popup-message popup-error">
      Impossible de charger le glossaire.{" "}
      <button type="button" onClick={onRetry}>
        Réessayer
      </button>
    </p>
  );
}

function Results({
  results,
  query,
}: {
  results: GlossaryEntry[];
  query: string;
}) {
  if (results.length === 0) return <NoResult query={query} />;
  return (
    <ul className="popup-results">
      {results.map((entry) => (
        <li key={entry.id}>
          <div className="entry-header">
            <strong>{entry.terme}</strong>
            {entry.categorie && (
              <span className="badge">{entry.categorie}</span>
            )}
          </div>
          <p>{entry.definition}</p>
          {entry.structureParente && (
            <p className="entry-source">
              Structure parente : {entry.structureParente}
            </p>
          )}
          {entry.source && (
            <p className="entry-source">Source : {entry.source}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function NoResult({ query }: { query: string }) {
  return (
    <p className="popup-message">
      {query.trim() ? (
        <>Aucun résultat pour « {query.trim()} ».</>
      ) : (
        "Aucun résultat."
      )}
      <br />
      <a href={GLOSSARY_EDIT_URL} target="_blank" rel="noopener noreferrer">
        Ajouter ce terme dans Notion
      </a>
    </p>
  );
}

function LastUpdated({ fetchedAt }: { fetchedAt: number | undefined }) {
  if (!fetchedAt) return null;
  return (
    <footer className="popup-footer">
      Mis à jour à {new Date(fetchedAt).toLocaleTimeString("fr-FR")}
    </footer>
  );
}

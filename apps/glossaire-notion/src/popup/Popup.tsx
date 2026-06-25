import { useEffect, useMemo, useRef, useState } from "react";
import { getOrFetchGlossary } from "../storage";
import { searchGlossary } from "../search";
import { GLOSSARY_EDIT_URL, type GlossaryEntry } from "../notion";

type Status = "loading" | "ready" | "error";

export function Popup() {
  const [status, setStatus] = useState<Status>("loading");
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number>();
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    load(false);
  }, []);

  // Extension popups don't reliably honor the `autoFocus` HTML attribute, so focus imperatively.
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const results = useMemo(() => searchGlossary(entries, query), [entries, query]);

  return (
    <main className="popup">
      <header className="popup-header">
        <h1>Glossaire transports sanitaires</h1>
        <button type="button" onClick={handleRefresh} disabled={refreshing} aria-label="Actualiser">
          ⟳
        </button>
      </header>

      <input
        ref={searchInputRef}
        type="search"
        placeholder="Rechercher un terme…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {status === "loading" && <p className="popup-message">Chargement du glossaire…</p>}

      {status === "error" && (
        <p className="popup-message popup-error">
          Impossible de charger le glossaire.{" "}
          <button type="button" onClick={() => load(false)}>
            Réessayer
          </button>
        </p>
      )}

      {status === "ready" && (
        <>
          <ul className="popup-results">
            {results.map((entry) => (
              <li key={entry.id}>
                <div className="entry-header">
                  <strong>{entry.terme}</strong>
                  {entry.categorie && <span className="badge">{entry.categorie}</span>}
                </div>
                <p>{entry.definition}</p>
                {entry.structureParente && (
                  <p className="entry-source">Structure parente : {entry.structureParente}</p>
                )}
                {entry.source && <p className="entry-source">Source : {entry.source}</p>}
              </li>
            ))}
          </ul>

          {results.length === 0 && (
            <p className="popup-message">
              {query.trim() ? <>Aucun résultat pour « {query.trim()} ».</> : "Aucun résultat."}
              <br />
              <a href={GLOSSARY_EDIT_URL} target="_blank" rel="noopener noreferrer">
                Ajouter ce terme dans Notion
              </a>
            </p>
          )}

          {fetchedAt && (
            <footer className="popup-footer">
              Mis à jour à {new Date(fetchedAt).toLocaleTimeString("fr-FR")}
            </footer>
          )}
        </>
      )}
    </main>
  );
}

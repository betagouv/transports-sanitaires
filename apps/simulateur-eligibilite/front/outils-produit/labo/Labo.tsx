// Écran **labo** : le produit y dépose une nouvelle version du fichier de règles
// (`.publicodes`), la valide en direct (erreurs affichées inline) et l'active pour
// tester le simulateur avec — sans déploiement. Accessible uniquement depuis
// l'identification quand le service « Transport Sanitaire » est sélectionné (cf.
// Identification.tsx + `estServiceProduit`).

import { useState } from "react";
import {
  activerLabo,
  desactiverLabo,
  historiqueLabo,
  type ResultatValidation,
  type VersionLabo,
  validerRegles,
  versionLaboActive,
} from "./labo";

type Props = {
  onRetour: () => void;
};

type Candidat = { nom: string; yaml: string; validation: ResultatValidation };

export function Labo({ onRetour }: Props) {
  const [candidat, setCandidat] = useState<Candidat | null>(null);
  const active = versionLaboActive();

  async function chargerFichier(fichier: File | undefined) {
    if (!fichier) return;
    const contenu = await fichier.text();
    setCandidat({
      nom: fichier.name,
      yaml: contenu,
      validation: validerRegles(contenu),
    });
  }

  return (
    <main
      className="fr-container"
      style={{ paddingTop: "2rem", paddingBottom: "4rem", maxWidth: "60rem" }}
    >
      <Introduction />
      {active && <VersionActive active={active} />}
      <ChampFichier onFichier={chargerFichier} />
      {candidat && <ApercuCandidat candidat={candidat} onActiver={activer} />}
      <Historique active={active} />

      <BoutonRetour onRetour={onRetour} />
    </main>
  );
}

// ---- implémentation ----

function BoutonRetour({ onRetour }: Props) {
  return (
    <div className="fr-btns-group fr-mt-4w">
      <button
        type="button"
        className="fr-btn fr-btn--tertiary"
        onClick={onRetour}
      >
        Retour au simulateur
      </button>
    </div>
  );
}

function Introduction() {
  return (
    <>
      <h1 className="fr-h3">Mode test des règles</h1>
      <p className="fr-text--sm fr-mb-3w">
        Chargez une version du fichier de règles (<code>.publicodes</code>) pour
        tester le simulateur avec, sans déploiement. Le test reste local à ce
        navigateur ; il n'affecte ni la production ni les autres utilisateurs.
      </p>
    </>
  );
}

// Active une version puis recharge : le moteur (singleton construit au boot) est
// reconstruit avec les règles de test au prochain chargement (cf. moteur.ts).
function activer(version: VersionLabo) {
  activerLabo(version);
  window.location.reload();
}

function revenirAuxOfficielles() {
  desactiverLabo();
  window.location.reload();
}

function VersionActive({ active }: { active: VersionLabo }) {
  return (
    <div className="fr-alert fr-alert--info fr-mb-3w">
      <p className="fr-alert__title">Règles de test actives : {active.nom}</p>
      <p>Chargées le {formaterDate(active.date)}.</p>
      <button
        type="button"
        className="fr-btn fr-btn--secondary fr-btn--sm fr-mt-1w"
        onClick={revenirAuxOfficielles}
      >
        Revenir aux règles officielles
      </button>
    </div>
  );
}

function ChampFichier({
  onFichier,
}: {
  onFichier: (fichier: File | undefined) => void;
}) {
  return (
    <div className="fr-input-group fr-mb-3w">
      <label className="fr-label" htmlFor="fichier-regles">
        Fichier de règles
        <span className="fr-hint-text">Format .publicodes (YAML)</span>
      </label>
      <input
        className="fr-input"
        type="file"
        id="fichier-regles"
        accept=".publicodes,.yaml,.yml,text/yaml"
        onChange={(e) => onFichier(e.target.files?.[0])}
      />
    </div>
  );
}

function Historique({ active }: { active: VersionLabo | null }) {
  const versions = historiqueLabo();
  if (versions.length === 0) return null;
  return (
    <section className="fr-mt-4w">
      <h2 className="fr-h6">Versions déjà chargées</h2>
      <ul className="fr-raw-list">
        {versions.map((v) => (
          <LigneHistorique
            key={v.date}
            version={v}
            estActive={active?.yaml === v.yaml}
          />
        ))}
      </ul>
    </section>
  );
}

function LigneHistorique({
  version,
  estActive,
}: {
  version: VersionLabo;
  estActive: boolean;
}) {
  return (
    <li
      className="fr-mb-1w"
      style={{ display: "flex", alignItems: "center", gap: "1rem" }}
    >
      <span>
        {version.nom}{" "}
        <span className="fr-text--sm fr-text-mention--grey">
          — {formaterDate(version.date)}
        </span>
      </span>
      {estActive ? (
        <span className="fr-badge fr-badge--success fr-badge--sm">Active</span>
      ) : (
        <button
          type="button"
          className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
          onClick={() => activer(version)}
        >
          Réactiver
        </button>
      )}
    </li>
  );
}

function ApercuCandidat({
  candidat,
  onActiver,
}: {
  candidat: Candidat;
  onActiver: (v: VersionLabo) => void;
}) {
  if (!candidat.validation.ok) {
    return (
      <div className="fr-alert fr-alert--error fr-mb-3w" role="alert">
        <p className="fr-alert__title">Fichier invalide — {candidat.nom}</p>
        <p style={{ whiteSpace: "pre-wrap" }}>{candidat.validation.erreur}</p>
      </div>
    );
  }
  return (
    <div className="fr-alert fr-alert--success fr-mb-3w">
      <p className="fr-alert__title">
        Fichier valide — {candidat.nom} ({candidat.validation.nbRegles} règles)
      </p>
      <button
        type="button"
        className="fr-btn fr-mt-1w"
        onClick={() =>
          onActiver({
            nom: candidat.nom,
            yaml: candidat.yaml,
            date: new Date().toISOString(),
          })
        }
      >
        Activer et tester
      </button>
    </div>
  );
}

function formaterDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

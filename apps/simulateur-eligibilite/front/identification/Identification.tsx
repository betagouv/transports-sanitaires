// Écran-porte d'identification du prescripteur : étape préalable **obligatoire**
// au simulateur (voir docs/architecture/identification.md — ADR-1). Formulaire à
// **révélation progressive** : chaque réponse dévoile la suite selon la branche
// (workflow §4). Composant de pure sélection ; à la validation il remonte la
// `IdentiteSaisie` brute à `onValide` (c'est la porte, App.tsx, qui la convertit
// en identité pseudonymisée via l'API et bascule vers le simulateur). Le
// référentiel par défaut est
// le snapshot factice (dev / tests) ; en production App injecte le client HTTP.

import type { ReactNode } from "react";
import { PRESCRIPTEUR_HORS_LISTE } from "../../shared/identite-saisie";
import {
  type Referentiel,
  snapshotReferentiel,
} from "../../shared/referentiel";
import { BoutonOutil, OutilsProduit } from "../outils-produit/OutilsProduit";
import type { SaisieIdentite } from "./saisie-identite";
import { useSaisieIdentite } from "./saisie-identite";

/**
 * Ce que la validation emporte, en plus de l'identité saisie : l'écran à ouvrir et
 * l'accès aux outils produit. Les trois boutons de cet écran passent par le même
 * `onValide` — l'identification est obligatoire quelle que soit la destination
 * (ADR-1), et il n'y a donc qu'un seul endroit qui pseudonymise.
 */
export type AccesIdentification = {
  destination: "simulateur" | "galerie" | "labo";
  /** Le service sélectionné déverrouille les outils produit (service n° 4). */
  outilsProduit: boolean;
};

type Props = {
  referentiel?: Referentiel;
  onValide: (
    saisie: SaisieIdentite["saisie"],
    acces: AccesIdentification,
  ) => void;
};

export function Identification({
  referentiel = snapshotReferentiel,
  onValide,
}: Props) {
  const saisie = useSaisieIdentite(referentiel);

  const entrer = (destination: AccesIdentification["destination"]) => {
    if (saisie.valide) {
      onValide(saisie.saisie, {
        destination,
        outilsProduit: saisie.outilsProduit,
      });
    }
  };

  return (
    <main
      className="fr-container"
      style={{ paddingTop: "2rem", paddingBottom: "4rem", maxWidth: "60rem" }}
    >
      <h1 className="fr-h3">Commencez par vous identifier</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          entrer("simulateur");
        }}
      >
        <Champs saisie={saisie} />
        <Actions saisie={saisie} onEntrer={entrer} />
      </form>
    </main>
  );
}

// ---- implémentation ----

type ChampsProps = { saisie: SaisieIdentite };

function Champs({ saisie }: ChampsProps) {
  return (
    <>
      <ChampEtablissement saisie={saisie} />
      <ChampService saisie={saisie} />
      <ChampServiceLibre saisie={saisie} />
      <ChampPrescripteur saisie={saisie} />
      <ChampsIdentiteLibre saisie={saisie} />
    </>
  );
}

function ChampEtablissement({ saisie }: ChampsProps) {
  return (
    <ListeDeroulante
      id="etablissement"
      label="Établissement"
      invite="Sélectionnez un établissement"
      valeur={saisie.champs.etabId}
      options={saisie.etablissements}
      onChange={(v) => saisie.modifier("etabId", v)}
    />
  );
}

function ChampService({ saisie }: ChampsProps) {
  if (!saisie.etabChoisi) return null;
  return (
    <ListeDeroulante
      id="service"
      label="Nom du service"
      invite="Sélectionnez un service"
      valeur={saisie.champs.serviceId}
      options={saisie.services}
      onChange={(v) => saisie.modifier("serviceId", v)}
    />
  );
}

function ChampServiceLibre({ saisie }: ChampsProps) {
  if (!saisie.serviceEstAutre) return null;
  return (
    <ChampTexte
      id="service-libre"
      label="Nom de votre service / unité"
      valeur={saisie.champs.serviceLibre}
      onChange={(v) => saisie.modifier("serviceLibre", v)}
    />
  );
}

function ChampPrescripteur({ saisie }: ChampsProps) {
  if (!saisie.serviceChoisi) return null;
  return (
    <ListeDeroulante
      id="prescripteur"
      label="Vous êtes"
      invite="Sélectionnez"
      valeur={saisie.champs.prescripteurId}
      options={saisie.prescripteurs}
      onChange={(v) => saisie.modifier("prescripteurId", v)}
    >
      <option value={PRESCRIPTEUR_HORS_LISTE}>{OPTION_HORS_LISTE}</option>
    </ListeDeroulante>
  );
}

function ChampsIdentiteLibre({ saisie }: ChampsProps) {
  if (!saisie.identiteLibre) return null;
  return (
    <>
      <ChampTexte
        id="nom"
        label="Votre nom"
        valeur={saisie.champs.nom}
        onChange={(v) => saisie.modifier("nom", v)}
      />
      <ChampTexte
        id="prenom"
        label="Votre prénom"
        valeur={saisie.champs.prenom}
        onChange={(v) => saisie.modifier("prenom", v)}
      />
    </>
  );
}

function Actions({
  saisie,
  onEntrer,
}: ChampsProps & {
  onEntrer: (destination: AccesIdentification["destination"]) => void;
}) {
  return (
    <>
      <div
        className="fr-btns-group fr-btns-group--inline"
        style={{ marginTop: "2rem" }}
      >
        <button type="submit" className="fr-btn" disabled={!saisie.valide}>
          Accéder au simulateur
        </button>
      </div>
      {saisie.outilsProduit && (
        <PanneauOutils valide={saisie.valide} onEntrer={onEntrer} />
      )}
    </>
  );
}

// Les deux outils produit sont côte à côte, hors des actions nominales. Ils
// restent désactivés tant que l'identification n'est pas complète : y entrer
// reste une entrée dans l'application, elle passe par la porte. Les situations
// de la galerie vivent dans `seeds/`, pas dans cet écran — les y égrener en
// boutons ne passait pas l'échelle.
function PanneauOutils({
  valide,
  onEntrer,
}: {
  valide: boolean;
  onEntrer: (destination: AccesIdentification["destination"]) => void;
}) {
  return (
    <OutilsProduit>
      <BoutonOutil onClick={() => onEntrer("galerie")} disabled={!valide}>
        Galerie de seeds
      </BoutonOutil>
      <BoutonOutil onClick={() => onEntrer("labo")} disabled={!valide}>
        Mode test des règles
      </BoutonOutil>
    </OutilsProduit>
  );
}

type ListeProps = {
  id: string;
  label: string;
  // Option affichée tant que rien n'est sélectionné.
  invite: string;
  valeur: string;
  options: Array<{ id: string; libelle: string }>;
  onChange: (valeur: string) => void;
  // Options supplémentaires ajoutées après la liste (ex. « hors liste »).
  children?: ReactNode;
};

function ListeDeroulante({
  id,
  label,
  invite,
  valeur,
  options,
  onChange,
  children,
}: ListeProps) {
  return (
    <div className="fr-select-group">
      <label className="fr-label" htmlFor={id}>
        {label}
      </label>
      <select
        className="fr-select"
        id={id}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled hidden>
          {invite}
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.libelle}
          </option>
        ))}
        {children}
      </select>
    </div>
  );
}

function ChampTexte({
  id,
  label,
  valeur,
  onChange,
}: {
  id: string;
  label: string;
  valeur: string;
  onChange: (valeur: string) => void;
}) {
  return (
    <div className="fr-input-group">
      <label className="fr-label" htmlFor={id}>
        {label}
      </label>
      <input
        className="fr-input"
        id={id}
        type="text"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

const OPTION_HORS_LISTE = "Je ne suis pas dans la liste";

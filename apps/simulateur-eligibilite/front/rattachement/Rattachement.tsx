// Écran-porte de rattachement (établissement et service) : étape préalable
// **obligatoire** au simulateur (voir docs/knowledge/adr/identification.md,
// ADR-1). Formulaire à **révélation progressive** : chaque réponse dévoile la
// suite selon la branche (workflow §4). Composant de pure sélection ; à la
// validation il remonte le `RattachementSaisi` à `onValide` (c'est la porte,
// App.tsx, qui le range en session et bascule vers le simulateur). Si le
// référentiel ne répond pas, l'écran le dit et laisse entrer avec le rattachement
// dégradé « Autre / Autre ». Le référentiel par défaut est le snapshot factice
// (dev / tests) ; en production App injecte le client HTTP.

import {
  type Referentiel,
  snapshotReferentiel,
} from "../../shared/referentiel";
import { EcranPleinePage } from "../app/EcranPleinePage";
import { BoutonOutil, OutilsProduit } from "../outils-produit/OutilsProduit";
import type { SaisieRattachement } from "./saisie-rattachement";
import { useSaisieRattachement } from "./saisie-rattachement";

/**
 * Ce que la validation emporte, en plus du rattachement saisi : l'écran à ouvrir et
 * l'accès aux outils produit. Les deux boutons de cet écran passent par le même
 * `onValide` : le rattachement est obligatoire quelle que soit la destination
 * (ADR-1), et il n'y a donc qu'un seul endroit qui le range.
 */
export type AccesRattachement = {
  destination: "simulateur" | "galerie";
  /** Le service sélectionné déverrouille les outils produit (service n° 4). */
  outilsProduit: boolean;
};

type Props = {
  referentiel?: Referentiel;
  onValide: (
    saisie: SaisieRattachement["saisie"],
    acces: AccesRattachement,
  ) => void;
};

export function Rattachement({
  referentiel = snapshotReferentiel,
  onValide,
}: Props) {
  const saisie = useSaisieRattachement(referentiel);

  const entrer = (destination: AccesRattachement["destination"]) => {
    if (saisie.valide) {
      onValide(saisie.saisie, {
        destination,
        outilsProduit: saisie.outilsProduit,
      });
    }
  };

  return (
    <EcranPleinePage etroit>
      <h1 className="fr-h3">
        Commencez par renseigner votre établissement et votre service
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          entrer("simulateur");
        }}
      >
        <FormulaireProgressif saisie={saisie} />
        <EntreesDansLApplication saisie={saisie} onEntrer={entrer} />
      </form>
    </EcranPleinePage>
  );
}

// ---- implémentation ----

type ChampsProps = { saisie: SaisieRattachement };

// Chaque réponse dévoile la suite : les champs en aval se rendent `null` tant
// que leur branche n'est pas empruntée (workflow §4). Sans référentiel, il n'y a
// rien à choisir : l'écran le dit, et la saisie est le rattachement dégradé.
function FormulaireProgressif({ saisie }: ChampsProps) {
  if (saisie.indisponible) return <ReferentielIndisponible />;
  return (
    <>
      <ChampEtablissement saisie={saisie} />
      <ChampService saisie={saisie} />
      <ChampServiceLibre saisie={saisie} />
    </>
  );
}

function ReferentielIndisponible() {
  return (
    <div className="fr-alert fr-alert--warning fr-alert--sm fr-mb-2w">
      <p>
        La liste des établissements est momentanément indisponible. Vous pouvez
        tout de même accéder au simulateur.
      </p>
    </div>
  );
}

function ChampEtablissement({ saisie }: ChampsProps) {
  return (
    <ListeDeroulante
      id="etablissement"
      libelle="Établissement"
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
      libelle="Nom du service"
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
      libelle="Nom de votre service / unité"
      valeur={saisie.champs.serviceLibre}
      onChange={(v) => saisie.modifier("serviceLibre", v)}
    />
  );
}

// Les deux sorties de cet écran — le simulateur, et les outils produit pour le
// service n° 4 — sont des entrées dans l'application, et passent donc par le
// même `onValide` (ADR-1).
function EntreesDansLApplication({
  saisie,
  onEntrer,
}: ChampsProps & {
  onEntrer: (destination: AccesRattachement["destination"]) => void;
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
      {saisie.outilsProduit && <PanneauOutils onEntrer={onEntrer} />}
    </>
  );
}

// La galerie est hors des actions nominales. Elle n'apparaît qu'une fois le
// service n° 4 choisi, ce qui complète la saisie : y entrer reste une entrée
// dans l'application, elle passe par la porte. Les
// situations de la galerie vivent dans `seeds/`, pas dans cet écran : les y
// égrener en boutons ne passait pas l'échelle.
function PanneauOutils({
  onEntrer,
}: {
  onEntrer: (destination: AccesRattachement["destination"]) => void;
}) {
  return (
    <OutilsProduit>
      <BoutonOutil onClick={() => onEntrer("galerie")}>
        Galerie de seeds
      </BoutonOutil>
    </OutilsProduit>
  );
}

type ListeProps = {
  id: string;
  libelle: string;
  // Option affichée tant que rien n'est sélectionné.
  invite: string;
  valeur: string;
  options: Array<{ id: string; libelle: string }>;
  onChange: (valeur: string) => void;
};

function ListeDeroulante({
  id,
  libelle,
  invite,
  valeur,
  options,
  onChange,
}: ListeProps) {
  return (
    <div className="fr-select-group">
      <label className="fr-label" htmlFor={id}>
        {libelle}
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
      </select>
    </div>
  );
}

function ChampTexte({
  id,
  libelle,
  valeur,
  onChange,
}: {
  id: string;
  libelle: string;
  valeur: string;
  onChange: (valeur: string) => void;
}) {
  return (
    <div className="fr-input-group">
      <label className="fr-label" htmlFor={id}>
        {libelle}
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

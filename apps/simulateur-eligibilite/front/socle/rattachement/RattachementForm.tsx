// Le formulaire de rattachement : établissement, puis service.
//
// Chaque réponse dévoile le champ suivant. À la validation, il remonte la saisie
// à `onValide`. Il ne range rien lui-même : c'est `RattachementScreen`.
//
// Si le référentiel ne répond pas, il le dit et laisse entrer avec le
// rattachement dégradé « Autre / Autre ».

import {
  type Referentiel,
  snapshotReferentiel,
} from "../../../shared/referentiel";
import { Container } from "../app/Container";
import { DeveloperTools, ToolButton } from "../developerTools/DeveloperTools";
import { SelectField } from "../ui/SelectField";
import { TextField } from "../ui/TextField";
import type { SaisieRattachement } from "./saisie-rattachement";
import { useSaisieRattachement } from "./saisie-rattachement";

/**
 * Ce que la validation emporte, en plus du rattachement saisi : l'écran à
 * ouvrir et l'accès aux developer tools. Les deux boutons passent par le même
 * `onValide` : le rattachement est obligatoire quelle que soit la destination
 * (ADR-1).
 */
export type AccesRattachement = {
  destination: "simulateur" | "seeds";
  /** Le service sélectionné déverrouille les developer tools (service n° 4). */
  developerTools: boolean;
};

type Props = {
  referentiel?: Referentiel;
  onValide: (
    saisie: SaisieRattachement["saisie"],
    acces: AccesRattachement,
  ) => void;
};

export function RattachementForm({
  referentiel = snapshotReferentiel,
  onValide,
}: Props) {
  const saisie = useSaisieRattachement(referentiel);

  const entrer = (destination: AccesRattachement["destination"]) => {
    if (saisie.valide) {
      onValide(saisie.saisie, {
        destination,
        developerTools: saisie.developerTools,
      });
    }
  };

  return (
    <Container etroit>
      <h1 className="fr-h3">
        Commencez par renseigner votre établissement et votre service
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          entrer("simulateur");
        }}
      >
        <ProgressiveFields saisie={saisie} />
        <EntreesDansLApplication saisie={saisie} onEntrer={entrer} />
      </form>
    </Container>
  );
}

// ---- implémentation ----

type FieldsProps = { saisie: SaisieRattachement };

// Chaque réponse dévoile le champ suivant (workflow §4). Sans référentiel, il
// n'y a rien à choisir : l'écran le dit, et le rattachement est celui de repli.
function ProgressiveFields({ saisie }: FieldsProps) {
  if (saisie.indisponible) return <ReferentielIndisponible />;
  return (
    <>
      <EtablissementField saisie={saisie} />
      <ServiceField saisie={saisie} />
      <ServiceLibreField saisie={saisie} />
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

function EtablissementField({ saisie }: FieldsProps) {
  return (
    <SelectField
      id="etablissement"
      label="Établissement"
      placeholder="Sélectionnez un établissement"
      value={saisie.champs.etabId}
      options={options(saisie.etablissements)}
      onChange={(v) => saisie.modifier("etabId", v)}
    />
  );
}

function ServiceField({ saisie }: FieldsProps) {
  if (!saisie.etabChoisi) return null;
  return (
    <SelectField
      id="service"
      label="Nom du service"
      placeholder="Sélectionnez un service"
      value={saisie.champs.serviceId}
      options={options(saisie.services)}
      onChange={(v) => saisie.modifier("serviceId", v)}
    />
  );
}

function ServiceLibreField({ saisie }: FieldsProps) {
  if (!saisie.serviceEstAutre) return null;
  return (
    <TextField
      id="service-libre"
      label="Nom de votre service / unité"
      value={saisie.champs.serviceLibre}
      onChange={(v) => saisie.modifier("serviceLibre", v)}
    />
  );
}

// Les deux sorties de cet écran sont le simulateur et, pour le service n° 4,
// les developer tools. Les deux passent par le même `onValide` (ADR-1).
function EntreesDansLApplication({
  saisie,
  onEntrer,
}: FieldsProps & {
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
      {saisie.developerTools && <DeveloperToolsPanel onEntrer={onEntrer} />}
    </>
  );
}

// L'écran des seeds est hors des actions normales. Son bouton apparaît une fois
// le service n° 4 choisi, donc une fois la saisie complète. Les seeds vivent
// dans `seeds/`, pas ici.
function DeveloperToolsPanel({
  onEntrer,
}: {
  onEntrer: (destination: AccesRattachement["destination"]) => void;
}) {
  return (
    <DeveloperTools>
      <ToolButton onClick={() => onEntrer("seeds")}>Seeds</ToolButton>
    </DeveloperTools>
  );
}

// Une entrée du référentiel, sous la forme qu'attend `SelectField`.
function options(entrees: ReadonlyArray<{ id: string; libelle: string }>) {
  return entrees.map(({ id, libelle }) => ({ value: id, label: libelle }));
}

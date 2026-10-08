// L'état du formulaire de rattachement : les deux listes chargées depuis le
// référentiel, les champs saisis, et ce qu'on en déduit.

import { useEffect, useState } from "react";
import {
  type RattachementSaisi,
  saisieComplete,
} from "../../../shared/rattachement-saisi";
import type {
  Etablissement,
  Referentiel,
  Service,
} from "../../../shared/referentiel";
import { estServiceProduit } from "../developerTools/unlock";

type Champs = {
  etabId: string;
  serviceId: string;
  serviceLibre: string;
};

export type SaisieRattachement = {
  etablissements: Etablissement[];
  services: Service[];
  // Une des listes n'a pas pu se charger. La saisie devient le rattachement de
  // repli « Autre / Autre », toujours complet.
  indisponible: boolean;
  champs: Champs;
  modifier: (champ: keyof Champs, valeur: string) => void;
  // Rattachement saisi tel qu'il partira à `onValide`, et s'il est complet.
  saisie: RattachementSaisi;
  valide: boolean;
  etabChoisi: boolean;
  // « Autre » sélectionné : la saisie du vrai service est obligatoire.
  serviceEstAutre: boolean;
  // Le service sélectionné déverrouille les developer tools (service n° 4).
  developerTools: boolean;
};

export function useSaisieRattachement(
  referentiel: Referentiel,
): SaisieRattachement {
  const [champs, setChamps] = useState<Champs>(CHAMPS_VIDES);
  const listes = useListes(referentiel, champs.etabId);
  const service = listes.services.find((s) => s.id === champs.serviceId);
  const serviceEstAutre = estAutre(service?.libelle ?? "");
  const saisie = listes.indisponible
    ? RATTACHEMENT_DEGRADE
    : construireSaisie(champs, serviceEstAutre);

  return {
    ...listes,
    champs,
    modifier: (champ, valeur) =>
      setChamps((actuels) =>
        avecDependantsEffaces({ ...actuels, [champ]: valeur }, champ),
      ),
    saisie,
    valide: saisieComplete(saisie),
    etabChoisi: champs.etabId !== "",
    serviceEstAutre,
    developerTools: !!service && estServiceProduit(service),
  };
}

// ---- implémentation ----

// Les deux listes déroulantes. Celle des services se recharge quand
// l'établissement change. Elle se vide d'abord, pour ne pas montrer les services
// du précédent pendant l'appel réseau. Un échec de l'une ou l'autre marque le
// référentiel indisponible.
function useListes(referentiel: Referentiel, etabId: string) {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [indisponible, setIndisponible] = useState(false);

  useEffect(() => {
    referentiel
      .listerEtablissements()
      .then((l) => setEtablissements(triParLibelle(l)))
      .catch(() => setIndisponible(true));
  }, [referentiel]);

  useEffect(() => {
    setServices([]);
    if (etabId) {
      referentiel
        .listerServices(etabId)
        .then((l) => setServices(triParLibelle(l)))
        .catch(() => setIndisponible(true));
    }
  }, [referentiel, etabId]);

  return { etablissements, services, indisponible };
}

// Changer un champ efface ce qui en dépend : le service quand l'établissement
// change, `serviceLibre` quand le service change.
function avecDependantsEffaces(champs: Champs, modifie: keyof Champs): Champs {
  const dependants = DEPENDANTS[modifie];
  if (!dependants) return champs;
  return { ...champs, ...Object.fromEntries(dependants.map((c) => [c, ""])) };
}

// L'établissement est toujours présent. Le service ne l'est qu'une fois choisi,
// et `serviceLibre` que sous « Autre ».
function construireSaisie(
  champs: Champs,
  serviceEstAutre: boolean,
): RattachementSaisi {
  const saisie: RattachementSaisi = { etabId: champs.etabId };
  if (!champs.etabId || !champs.serviceId) return saisie;
  saisie.serviceId = champs.serviceId;
  if (serviceEstAutre) {
    saisie.serviceEstAutre = true;
    saisie.serviceLibre = champs.serviceLibre;
  }
  return saisie;
}

// « Autre » (service non listé) reste toujours en fin de liste.
function estAutre(libelle: string): boolean {
  return libelle.trim().toLowerCase() === "autre";
}

// Tri alphabétique français, sans tenir compte de la casse ni des accents.
// « Autre » passe en fin de liste.
function triParLibelle<T extends { libelle: string }>(liste: T[]): T[] {
  return [...liste].sort((a, b) => {
    if (estAutre(a.libelle) !== estAutre(b.libelle)) {
      return estAutre(a.libelle) ? 1 : -1;
    }
    return a.libelle.localeCompare(b.libelle, "fr", { sensitivity: "base" });
  });
}

// Le rattachement de repli quand le référentiel ne répond pas. L'utilisateur
// entre quand même, et l'analytics range sa visite sous « autre ».
const RATTACHEMENT_DEGRADE: RattachementSaisi = {
  etabId: "autre",
  serviceId: "autre",
};

const CHAMPS_VIDES: Champs = {
  etabId: "",
  serviceId: "",
  serviceLibre: "",
};

const DEPENDANTS: Partial<Record<keyof Champs, Array<keyof Champs>>> = {
  etabId: ["serviceId", "serviceLibre"],
  serviceId: ["serviceLibre"],
};

// L'état du formulaire de rattachement : les deux listes en cascade chargées
// depuis le référentiel, les champs saisis, et ce qu'on en déduit : saisie
// complète, service « Autre », accès aux developer tools, référentiel indisponible.

import { useEffect, useState } from "react";
import {
  type RattachementSaisi,
  saisieComplete,
} from "../../shared/rattachement-saisi";
import type {
  Etablissement,
  Referentiel,
  Service,
} from "../../shared/referentiel";
import { estServiceProduit } from "../developerTools/deverrouillage";

type Champs = {
  etabId: string;
  serviceId: string;
  serviceLibre: string;
};

export type SaisieRattachement = {
  etablissements: Etablissement[];
  services: Service[];
  // Une des listes n'a pas pu se charger : la saisie devient le rattachement
  // dégradé « Autre / Autre », complet d'office.
  indisponible: boolean;
  champs: Champs;
  modifier: (champ: keyof Champs, valeur: string) => void;
  // Rattachement saisi tel qu'il partira à `onValide`, et s'il est complet.
  saisie: RattachementSaisi;
  valide: boolean;
  etabChoisi: boolean;
  // « Autre » sélectionné → saisie du service/unité réel obligatoire.
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
        avecAvalEfface({ ...actuels, [champ]: valeur }, champ),
      ),
    saisie,
    valide: saisieComplete(saisie),
    etabChoisi: champs.etabId !== "",
    serviceEstAutre,
    developerTools: !!service && estServiceProduit(service),
  };
}

// ---- implémentation ----

// Les deux listes déroulantes : celle des services se recharge quand
// l'établissement change, et se vide immédiatement pour ne jamais afficher les
// entrées du précédent le temps de l'aller-retour réseau. Un échec de l'une ou
// l'autre marque le référentiel indisponible.
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

// Changer un champ invalide ce qui en dépend : un service ne survit pas au
// changement d'établissement, ni `serviceLibre` au changement de service.
function avecAvalEfface(champs: Champs, modifie: keyof Champs): Champs {
  const aval = AVAL[modifie];
  if (!aval) return champs;
  return { ...champs, ...Object.fromEntries(aval.map((c) => [c, ""])) };
}

// L'établissement est toujours porté ; le service n'a de sens qu'une fois
// choisi, et `serviceLibre` qu'une fois la branche « Autre » empruntée.
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

// « Autre » (service / unité non listé du référentiel) reste toujours en **fin**
// de liste, quel que soit l'ordre alphabétique.
function estAutre(libelle: string): boolean {
  return libelle.trim().toLowerCase() === "autre";
}

// Tri alphabétique des listes déroulantes (locale FR, insensible à la casse et
// aux accents), « Autre » repoussé en fin de liste.
function triParLibelle<T extends { libelle: string }>(liste: T[]): T[] {
  return [...liste].sort((a, b) => {
    if (estAutre(a.libelle) !== estAutre(b.libelle)) {
      return estAutre(a.libelle) ? 1 : -1;
    }
    return a.libelle.localeCompare(b.libelle, "fr", { sensitivity: "base" });
  });
}

// Le rattachement de repli quand le référentiel ne répond pas : l'utilisateur
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

const AVAL: Partial<Record<keyof Champs, Array<keyof Champs>>> = {
  etabId: ["serviceId", "serviceLibre"],
  serviceId: ["serviceLibre"],
};

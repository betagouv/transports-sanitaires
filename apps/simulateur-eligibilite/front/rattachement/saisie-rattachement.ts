// L'état du formulaire de rattachement : les deux listes en cascade chargées
// depuis le référentiel, les champs saisis, et ce qu'on en déduit — saisie
// complète, service « Autre », accès aux outils produit.

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
import { estServiceProduit } from "../outils-produit/deverrouillage";

type Champs = {
  etabId: string;
  serviceId: string;
  serviceLibre: string;
};

export type SaisieRattachement = {
  etablissements: Etablissement[];
  services: Service[];
  champs: Champs;
  modifier: (champ: keyof Champs, valeur: string) => void;
  // Rattachement saisi tel qu'il partira à `onValide`, et s'il est complet.
  saisie: RattachementSaisi;
  valide: boolean;
  etabChoisi: boolean;
  // « Autre » sélectionné → saisie du service/unité réel obligatoire.
  serviceEstAutre: boolean;
  // Le service sélectionné déverrouille les outils produit (service n° 4).
  outilsProduit: boolean;
};

export function useSaisieRattachement(
  referentiel: Referentiel,
): SaisieRattachement {
  const [champs, setChamps] = useState<Champs>(CHAMPS_VIDES);
  const listes = useListes(referentiel, champs.etabId);
  const service = listes.services.find((s) => s.id === champs.serviceId);
  const serviceEstAutre = estAutre(service?.libelle ?? "");
  const saisie = construireSaisie(champs, serviceEstAutre);

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
    outilsProduit: !!service && estServiceProduit(service),
  };
}

// ---- implémentation ----

// Les deux listes déroulantes : celle des services se recharge quand
// l'établissement change, et se vide immédiatement pour ne jamais afficher les
// entrées du précédent le temps de l'aller-retour réseau.
function useListes(referentiel: Referentiel, etabId: string) {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    referentiel
      .listerEtablissements()
      .then((l) => setEtablissements(triParLibelle(l)));
  }, [referentiel]);

  useEffect(() => {
    setServices([]);
    if (etabId) {
      referentiel
        .listerServices(etabId)
        .then((l) => setServices(triParLibelle(l)));
    }
  }, [referentiel, etabId]);

  return { etablissements, services };
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

const CHAMPS_VIDES: Champs = {
  etabId: "",
  serviceId: "",
  serviceLibre: "",
};

const AVAL: Partial<Record<keyof Champs, Array<keyof Champs>>> = {
  etabId: ["serviceId", "serviceLibre"],
  serviceId: ["serviceLibre"],
};

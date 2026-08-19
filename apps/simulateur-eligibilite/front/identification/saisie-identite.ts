// L'état du formulaire d'identification : les trois listes en cascade chargées
// depuis le référentiel, les champs saisis, et ce qu'on en déduit — saisie
// complète, service « Autre », accès aux outils produit.

import { useEffect, useState } from "react";
import {
  type IdentiteSaisie,
  PRESCRIPTEUR_HORS_LISTE,
  saisieComplete,
} from "../../shared/identite-saisie";
import type {
  Etablissement,
  Prescripteur,
  Referentiel,
  Service,
} from "../../shared/referentiel";
import { estServiceProduit } from "../outils-produit/deverrouillage";

export type Champs = {
  etabId: string;
  serviceId: string;
  serviceLibre: string;
  prescripteurId: string;
  nom: string;
  prenom: string;
};

export type SaisieIdentite = {
  etablissements: Etablissement[];
  services: Service[];
  prescripteurs: Prescripteur[];
  champs: Champs;
  modifier: (champ: keyof Champs, valeur: string) => void;
  // Identité saisie telle qu'elle partira à `onValide`, et si elle est complète.
  saisie: IdentiteSaisie;
  valide: boolean;
  etabChoisi: boolean;
  serviceChoisi: boolean;
  // « Autre » sélectionné → saisie du service/unité réel obligatoire.
  serviceEstAutre: boolean;
  // Prescripteur hors liste → nom et prénom à saisir.
  identiteLibre: boolean;
  // Le service sélectionné déverrouille les outils produit (service n° 4).
  outilsProduit: boolean;
};

export function useSaisieIdentite(referentiel: Referentiel): SaisieIdentite {
  const [champs, setChamps] = useState<Champs>(CHAMPS_VIDES);
  const listes = useListes(referentiel, champs.etabId, champs.serviceId);
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
    serviceChoisi: champs.serviceId !== "",
    serviceEstAutre,
    identiteLibre:
      champs.serviceId !== "" &&
      champs.prescripteurId === PRESCRIPTEUR_HORS_LISTE,
    outilsProduit: !!service && estServiceProduit(service),
  };
}

// ---- implémentation ----

// Les trois listes déroulantes : chacune se recharge quand son parent change,
// et se vide immédiatement pour ne jamais afficher les entrées du parent
// précédent le temps de l'aller-retour réseau.
function useListes(
  referentiel: Referentiel,
  etabId: string,
  serviceId: string,
) {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [prescripteurs, setPrescripteurs] = useState<Prescripteur[]>([]);

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

  useEffect(() => {
    setPrescripteurs([]);
    if (serviceId) {
      referentiel
        .listerPrescripteurs(serviceId)
        .then((l) => setPrescripteurs(triParLibelle(l)));
    }
  }, [referentiel, serviceId]);

  return { etablissements, services, prescripteurs };
}

// Changer un champ invalide ce qui en dépend : un service ne survit pas au
// changement d'établissement, ni un prescripteur au changement de service.
function avecAvalEfface(champs: Champs, modifie: keyof Champs): Champs {
  const aval = AVAL[modifie];
  if (!aval) return champs;
  return { ...champs, ...Object.fromEntries(aval.map((c) => [c, ""])) };
}

// L'établissement est toujours porté ; le reste n'a de sens qu'une fois le
// service choisi, et les champs libres qu'une fois leur branche empruntée.
function construireSaisie(
  champs: Champs,
  serviceEstAutre: boolean,
): IdentiteSaisie {
  const saisie: IdentiteSaisie = { etabId: champs.etabId };
  if (!champs.etabId || !champs.serviceId) return saisie;
  saisie.serviceId = champs.serviceId;
  if (serviceEstAutre) {
    saisie.serviceEstAutre = true;
    saisie.serviceLibre = champs.serviceLibre;
  }
  saisie.prescripteurId = champs.prescripteurId;
  if (champs.prescripteurId === PRESCRIPTEUR_HORS_LISTE) {
    saisie.nom = champs.nom;
    saisie.prenom = champs.prenom;
  }
  return saisie;
}

// « Autre » (service / unité non listé du référentiel) reste toujours en **fin**
// de liste, quel que soit l'ordre alphabétique.
function estAutre(libelle: string): boolean {
  return libelle.trim().toLowerCase() === "autre";
}

// Tri alphabétique des listes déroulantes (locale FR, insensible à la casse et
// aux accents), « Autre » repoussé en fin de liste. L'option spéciale « hors
// liste » est ajoutée séparément après la liste et garde sa place.
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
  prescripteurId: "",
  nom: "",
  prenom: "",
};

const AVAL: Partial<Record<keyof Champs, Array<keyof Champs>>> = {
  etabId: ["serviceId", "serviceLibre", "prescripteurId", "nom", "prenom"],
  serviceId: ["serviceLibre", "prescripteurId", "nom", "prenom"],
};

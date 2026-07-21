// Briques de mise en page du bloc « Information destinée au patient », partagées
// entre la Page Résultat 1 (résultat médical, prescripteur) et la Page Résultat 2
// (document administratif, secrétariat). Le contenu en langage clair (critères et
// motifs) vient du dictionnaire `vulgarisation.tsx` ; ce module ne fait que
// l'agencer. Seuls les intitulés diffèrent d'une page à l'autre (ton « résultat »
// vs « document ») : ils sont passés en props, le texte restant est identique.

import { ListeVulgarisee, type Item } from "./vulgarisation";

// Sous-titre iconographié du bloc patient (h4 DSFR).
export function SousTitre({
  icone,
  children,
}: {
  icone: string;
  children: string;
}) {
  return (
    <h4 className="fr-h6 fr-mt-3w">
      <span className={`${icone} fr-mr-1w`} aria-hidden="true" />
      {children}
    </h4>
  );
}

// Séquence favorable : explication du choix + critères et motifs retenus.
// Structure identique entre les deux pages ; seuls les intitulés diffèrent.
export function PourquoiCeTransport({
  titreExplication,
  criteres,
  titreCriteres,
  motifs,
  titreMotifs,
}: {
  titreExplication: string;
  criteres: Item[];
  titreCriteres: string;
  motifs: Item[];
  titreMotifs: string;
}) {
  return (
    <>
      <SousTitre icone="fr-icon-lightbulb-line">{titreExplication}</SousTitre>
      <p>
        Ce choix correspond à votre situation au moment du transport et à l’aide
        dont vous avez besoin pendant le trajet.
      </p>

      {criteres.length > 0 && (
        <>
          <SousTitre icone="fr-icon-stethoscope-line">{titreCriteres}</SousTitre>
          <ListeVulgarisee items={criteres} />
        </>
      )}

      {motifs.length > 0 && (
        <>
          <SousTitre icone="fr-icon-checkbox-circle-line">{titreMotifs}</SousTitre>
          <ListeVulgarisee items={motifs} />
        </>
      )}
    </>
  );
}

// Corps défavorable : aucun transport sanitaire ne peut être prescrit. Texte
// **identique** entre les deux pages résultat (aucune variation), d'où l'absence
// de props.
export function ExplicationTransportImpossible() {
  return (
    <>
      <p>
        Dans votre situation, les informations renseignées ne permettent pas à
        votre médecin de prescrire un transport sanitaire.
      </p>

      <SousTitre icone="fr-icon-lightbulb-line">Quelques explications</SousTitre>
      <p className="fr-mb-2w">
        Pour qu’un transport sanitaire puisse être prescrit, deux éléments
        doivent être réunis :
      </p>
      <p className="fr-mb-2w">
        <strong style={{ display: "block", marginBottom: "0.5rem" }}>
          1. Une situation ouvrant droit à la prise en charge
        </strong>
        Par exemple : une hospitalisation, certains soins liés à une affection
        de longue durée, un accident du travail, une maladie professionnelle ou
        une autre situation prévue par l’Assurance Maladie.
      </p>
      <p className="fr-mb-2w">
        <strong style={{ display: "block", marginBottom: "0.5rem" }}>
          2. Un besoin médical de transport adapté
        </strong>
        Par exemple : un besoin d’être transporté en ambulance, en VSL, en taxi
        conventionné, dans un véhicule adapté au fauteuil roulant, ou avec un
        niveau d’aide compatible avec votre état de santé.
      </p>
      <p>
        Dans les informations indiquées, au moins l’un de ces deux éléments n’est
        pas suffisamment établi.
      </p>
    </>
  );
}

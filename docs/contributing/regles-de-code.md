# Les règles de code

> Les 15 règles `QUAL-*`. Les conventions du dépôt sont dans
> [`../../AGENTS.md`](../../AGENTS.md), les règles de commit dans
> [`regles-git.md`](regles-git.md).

**15 règles**. Chacune a son identifiant. Cite-le en revue ou en commit
(« corrige QUAL-006 ») plutôt que de reformuler la règle.

| Id | Règle | Garde |
|---|---|---|
| QUAL-001 | Un fichier s'ouvre sur son contrat | `lisibilite.test.ts` |
| QUAL-002 | Le privé descend sous le marqueur d'implémentation | `lisibilite.test.ts` |
| QUAL-003 | Un helper privé est une `function` hoistée | `lisibilite.test.ts` |
| QUAL-004 | Rien ne s'exécute au chargement du module | aucune |
| QUAL-005 | Couper aux jointures du sens, pas pour tenir le budget | `architecture.test.ts` (détecte seulement) |
| QUAL-006 | Séparer les branches, pas la répétition | aucune |
| QUAL-007 | Un nom ajoute ce que le site d'appel ne dit pas | aucune |
| QUAL-008 | Répéter un littéral plutôt que fabriquer un fragment sans nom | aucune |
| QUAL-009 | Une fonction choisit, les autres font | aucune |
| QUAL-010 | Un fichier se sépare par sujet, pas par débordement | `architecture.test.ts` (détecte seulement) |
| QUAL-011 | Un fichier porte le nom d'une capacité, pas d'une catégorie | `lisibilite.test.ts` |
| QUAL-012 | N'exporter que ce qu'un autre fichier importe | `pnpm knip` |
| QUAL-013 | Ne jamais formater à la main | Biome |
| QUAL-014 | Pas de suppression pour un linter que le projet ne lance pas | aucune |
| QUAL-015 | Une suppression nomme sa règle et sa raison | Biome |

Six règles n'ont aucune garde. Ce sont des règles de jugement : une assertion
dirait *qu'*on a coupé, jamais *si* on a coupé au bon endroit. Elles restent à la
revue, et le tableau le dit plutôt que de le laisser croire.

---

### QUAL-001 - Un fichier s'ouvre sur son contrat

> Raison : un lecteur qui ouvre un fichier cherche ce qu'il peut en appeler, pas
> comment c'est fait. Sans ordre imposé, il lit tout pour trouver l'export qui
> l'intéresse.

Dans l'ordre :

1. un en-tête de quelques lignes, qui dit *ce que ce fichier permet de faire* ;
2. les types publics ;
3. les exports, dans l'ordre où un appelant les rencontre.

Le pourquoi, l'histoire et les contraintes descendent à côté du code qu'ils
expliquent, pas dans un préambule.

**Exemples**

```ts
// ✅ OK
// Les deux lectures typées du moteur d'éligibilité.

export type Cible = "cible_cas_final" | "cible_document_depart_ville";

export function texte(moteur: Engine, cible: Cible): string { … }
```

```ts
// ❌ KO
import Engine from "publicodes"; // le fichier ouvre sur un import, sans en-tête

const SEPARATEUR = " . "; // du privé avant le contrat

export type Cible = "cible_cas_final" | "cible_document_depart_ville";
```

*Gardé par* `tests/lisibilite.test.ts › un fichier se lit comme son contrat ›
chaque fichier s'ouvre sur un en-tête`.

---

### QUAL-002 - Le privé descend sous le marqueur d'implémentation

> Raison : le lecteur doit pouvoir s'arrêter au marqueur. Au-dessus, ce qu'on
> peut appeler ; en dessous, la façon dont c'est fait.

Le marqueur est `// ---- implémentation ----`. Les constantes privées descendent
avec, dès qu'elles ne sont lues que dans des fonctions. Un type ou une constante
dont un export est bâti restent au-dessus : ils font partie du contrat.

**Exemples**

```ts
// ✅ OK
export function texte(moteur: Engine, cible: Cible): string {
  return normaliser(moteur.evaluate(cible).nodeValue);
}

// ---- implémentation ----

const VIDE = "";

function normaliser(valeur: unknown): string { … }
```

```ts
// ❌ KO
const VIDE = "";

function normaliser(valeur: unknown): string { … } // le privé mêlé au contrat

export function texte(moteur: Engine, cible: Cible): string { … }
```

*Gardé par* `tests/lisibilite.test.ts › un fichier se lit comme son contrat › un
fichier qui a du privé le range sous le marqueur d'implémentation`.

---

### QUAL-003 - Un helper privé est une `function` hoistée

> Raison : un privé sous le marqueur est appelé depuis plus haut. En `const`
> fléché, il n'existe pas encore au moment de l'appel. C'est une erreur TDZ à
> l'exécution, que le typecheck ne voit pas.

**Exemples**

```ts
// ✅ OK
function normaliser(valeur: unknown): string { … }
```

```ts
// ❌ KO
const normaliser = (valeur: unknown): string => { … };
```

*Gardé par* `tests/lisibilite.test.ts › un fichier se lit comme son contrat › les
helpers privés sont des fonctions hoistées`.

---

### QUAL-004 - Rien ne s'exécute au chargement du module

> Raison : un effet au chargement part dès qu'un fichier importe le module, dans
> un ordre que personne ne contrôle. Les tests le subissent aussi, et se mettent
> à dépendre d'un réseau ou d'un secret qu'ils n'ont pas demandé.

Une exception : un point d'entrée explicite, en tête de fichier.

**Exemples**

```ts
// ✅ OK : rien ne part tant que personne n'appelle
export function referentiel(): Referentiel {
  return depuisGrist(configuration().gristDocUrl);
}
```

```ts
// ❌ KO : part à l'import, tests compris
export const referentiel = depuisGrist(process.env.GRIST_DOC_URL);
```

*Aucune garde.* À écrire.

---

### QUAL-005 - Couper aux jointures du sens, pas pour tenir le budget

> Raison : la limite de 30 lignes détecte une fonction qui fait plusieurs choses.
> Elle ne dit pas où couper. Une coupe faite pour la limite déplace le problème
> et ajoute un saut de lecture.

Le test : **ferais-tu la même extraction si la limite n'existait pas ?** Sinon,
tu coupes au mauvais endroit.

**Exemples**

```tsx
// ✅ OK : l'extraction qu'on ferait sans limite : un nom par situation
function Bloc1Resultat({ cas }: Props) {
  if (cas === "PMT") return <PrescriptionMedicale />;
  if (cas === "DAP") return <AccordPrealable />;
  return <NonEligible />;
}
```

```tsx
// ❌ KO : coupé au point où ça débordait, sur un nom qui décrit le balisage
function Bloc1Resultat({ cas }: Props) {
  return (
    <>
      <EnTetes cas={cas} />
      <CorpsSuite cas={cas} />
    </>
  );
}
```

*Gardé par* `tests/architecture.test.ts › taille du code › aucune fonction ne
dépasse 30 lignes`, en lignes réelles. Biome porte la même limite pour le retour
dans l'éditeur, mais il compte des lignes *logiques* : un bloc de texte JSX y
pèse une ligne. C'est le test qui fait foi.

---

### QUAL-006 - Séparer les branches, pas la répétition

> Raison : extraire le fragment que deux branches partagent est la coupe la moins
> chère et la mauvaise. Le parent fait toujours ce qu'il faisait, moins quelques
> lignes.

Un branchement sur des cas métier est la jointure. Chaque branche devient une
fonction nommée d'après le cas qu'elle répond, et le parent se réduit à un
aiguillage d'une ligne.

**Exemples**

```tsx
// ✅ OK : une fonction par cas, le parent aiguille
function Bloc3CasRetenu({ cas }: Props) {
  return cas === "SMUR" ? <PriseEnChargeSmur /> : <ChargeEtablissement />;
}
```

```tsx
// ❌ KO : le partagé est extrait, le parent garde les deux cas
function Bloc3CasRetenu({ cas }: Props) {
  return (
    <section>
      <Rappel cas={cas} />
      {cas === "SMUR" ? <p>Transport d'urgence…</p> : <p>À la charge de…</p>}
    </section>
  );
}
```

*Aucune garde.* C'est du jugement, pas de la forme.

---

### QUAL-007 - Un nom ajoute ce que le site d'appel ne dit pas

> Raison : un nom qui répète l'emplacement ou le balisage n'apprend rien au
> lecteur, et lui coûte quand même le saut jusqu'à la définition.

**Exemples**

```tsx
// ✅ OK : le nom dit quelle situation est répondue
<AucunTransportPrescrit />
```

```tsx
// ❌ KO : l'emplacement, puis le balisage : un fragment, pas une intention
<PiedDePage />
<Introduction />
<EnTetes />
```

*Aucune garde.* C'est du jugement, pas de la forme.

---

### QUAL-008 - Répéter un littéral plutôt que fabriquer un fragment sans nom

> Raison : deux lignes identiques dans deux branches ne coûtent rien. Un
> composant d'une ligne sans intention coûte un saut à chaque lecteur, pour
> toujours.

On ne factorise que ce qui a un nom propre, prend des paramètres et sert des
appelants sans rapport.

**Exemples**

```tsx
// ✅ OK : le <li> commun est répété, chaque branche se lit d'un bloc
function Etapes({ cas }: Props) {
  if (cas === "PMT") {
    return <ul><li>Signer</li><li>Remettre au patient</li></ul>;
  }
  return <ul><li>Faire viser</li><li>Remettre au patient</li></ul>;
}
```

```tsx
// ❌ KO : un composant d'une ligne, sans nom propre ni paramètre
function LigneRemise() {
  return <li>Remettre au patient</li>;
}
```

*Aucune garde.* C'est du jugement, pas de la forme.

---

### QUAL-009 - Une fonction choisit, les autres font

> Raison : une fonction qui choisit *et* fait ne se relit pas. On ne voit plus
> les cas qu'elle couvre, et ajouter un cas oblige à comprendre le traitement.

**Exemples**

```ts
// ✅ OK : elle choisit, elle délègue
export function documentPour(cas: CasFinal): Document {
  return cas === "PMT" ? remplirPmt() : remplirDap();
}
```

```ts
// ❌ KO : elle choisit et remplit dans la même branche
export function documentPour(cas: CasFinal): Document {
  if (cas === "PMT") {
    const modele = charger("pmt");
    return ecrire(modele, champsPmt());
  }
  return remplirDap();
}
```

*Aucune garde.* C'est du jugement, pas de la forme.

---

### QUAL-010 - Un fichier se sépare par sujet, pas par débordement

> Raison : couper un fichier au point où il dépasse 300 lignes produit deux
> fichiers dont aucun n'a de sujet. Le second n'est nommable que par sa position.

**Exemples**

```
✅ OK : coupé par sujet, chaque nom dit une capacité
cerfa/remplissage.ts       ce qu'est un tableau de remplissage
cerfa/lieux-du-trajet.ts   les adresses, aplaties sur une ligne
```

```
❌ KO : coupé là où ça débordait
cerfa/remplissage.ts
cerfa/remplissage-suite.ts
```

*Gardé par* `tests/architecture.test.ts › taille du code › aucun fichier ne
dépasse 300 lignes`.

---

### QUAL-011 - Un fichier porte le nom d'une capacité, pas d'une catégorie

> Raison : si le nom a besoin d'`utils`, `helpers`, `commun` ou `acces` pour
> fonctionner, le fichier n'a pas d'intention. Son contenu appartient à ses
> appelants.

**Exemples**

```
✅ OK
deverrouillage.ts  passation.ts  pagination.ts  lieux-du-trajet.ts
```

```
❌ KO
utils.ts  helpers.ts  commun.ts  acces.ts
```

*Gardé par* `tests/lisibilite.test.ts › un nom dit une intention › aucun fichier
ne porte un nom de catégorie`.

---

### QUAL-012 - N'exporter que ce qu'un autre fichier importe

> Raison : un export non lu se présente comme un point d'entrée. Un lecteur le
> prend pour tel, et l'API du fichier devient plus large qu'elle n'est.

Un export qui est de la documentation et non du code appelé le déclare par un
`@public` motivé.

**Exemples**

```ts
// ✅ OK : un seul point d'entrée
const SERVICE_PRODUIT = 4;

export function estServiceProduit(idService: number): boolean {
  return idService === SERVICE_PRODUIT;
}
```

```ts
// ❌ KO : deux exports que personne n'importe
export const SERVICE_PRODUIT = 4;
export const CLE_SESSION = "identite";

export function estServiceProduit(idService: number): boolean { … }
```

*Gardé par* `pnpm knip`, dans `verifier`. C'est le défaut qu'a livré le fichier
aujourd'hui appelé `deverrouillage.ts`.

---

### QUAL-013 - Ne jamais formater à la main

> Raison : Biome tient le format, l'ordre des imports et le lint, sur le même
> socle (`biome.base.jsonc`) pour les trois apps. Une mise en forme manuelle est
> défaite au passage suivant, et le diff porte alors deux changements.

Un hook `PostToolUse` passe Biome sur chaque `.ts` / `.tsx` écrit, dans n'importe
quelle app. Le format n'est jamais à toi de défendre.

**Exemples**

```ts
// ✅ OK : la forme que Biome écrit
const CIBLES = {
  pmt: "cible_pmt",
  dap: "cible_dap",
};
```

```ts
// ❌ KO : alignement tenu à la main
const CIBLES = {
  pmt : "cible_pmt",
  dap : "cible_dap",
};
```

*Gardé par* Biome, dans `pnpm lint`, lui-même dans `verifier`.

---

### QUAL-014 - Pas de suppression pour un linter que le projet ne lance pas

> Raison : le projet ne lance que Biome. Une directive `eslint-disable` ne
> supprime rien, et personne ne s'en aperçoit puisque rien ne la lit.

**Exemples**

```tsx
// ✅ OK
// biome-ignore lint/correctness/useExhaustiveDependencies: le moteur est stable
```

```tsx
// ❌ KO : a dormi des mois dans Parcours.tsx sans rien supprimer
// eslint-disable-next-line react-hooks/exhaustive-deps
```

*Aucune garde.* Biome ne voit pas les directives d'un autre linter.

---

### QUAL-015 - Une suppression nomme sa règle et sa raison

> Raison : une suppression sans raison se recopie. Posée à distance de la ligne
> fautive, elle ne supprime rien et survit à la disparition du défaut.

La forme est `// biome-ignore <règle>: <raison>`, sur la ligne **immédiatement**
avant la ligne fautive, la raison en toutes lettres.

**Exemples**

```tsx
// ✅ OK
// biome-ignore lint/suspicious/noArrayIndexKey: pas d'autre identifiant stable
key={index}
```

```tsx
// ❌ KO : pas de raison, et une ligne d'écart avec la fautive
// biome-ignore lint/suspicious/noArrayIndexKey
style={{ fontWeight: 700 }}
key={index}
```

*Gardé par* Biome, règle `suppressions/unused` : une suppression qui ne supprime
rien est signalée.

// Opt-out de la mesure d'audience du simulateur, côté CMS (Sites Conformes).
//
// Le simulateur vit dans une iframe du CMS ; l'opt-out, lui, est dans le pied de
// page du CMS. Ce script y ajoute le bouton, garde le choix sur le domaine du CMS
// et le transmet au simulateur par `postMessage`, quand celui-ci le demande puis à
// chaque changement. Le protocole est celui de
// `front/analytics/choix-analytics.ts`. Voir docs/knowledge/adr/analytics.md,
// ADR-5.
//
// À coller dans Sites Conformes : Paramètres → Scripts personnalisés → « Scripts
// dans la section <body> », entre `<script type="module">` et `</script>`. En
// module, il a sa propre portée (rien ne fuit dans la page du CMS) et s'exécute
// une fois la page analysée, pied de page compris.

// L'origine du simulateur embarqué : seul lui reçoit le choix.
const ORIGINE_SIMULATEUR = "https://simulateur.example";
const CLE = "statistiques-simulateur-refusees";
const LIBELLES = {
  suivi: "Désactiver la mesure d'audience du simulateur",
  refus: "Réactiver la mesure d'audience du simulateur",
};

// Le choix vit en mémoire, et dans le stockage du CMS quand il est disponible.
let refus = lireRefus();
// Les simulateurs qui ont demandé le choix, à prévenir s'il change.
const abonnes = [];

window.addEventListener("message", (e) => {
  if (e.origin !== ORIGINE_SIMULATEUR) return;
  if (e.data?.type !== "statistiques-simulateur:demande") return;
  if (!abonnes.includes(e.source)) abonnes.push(e.source);
  prevenir(e.source);
});

ajouterAuPiedDePage();

function ajouterAuPiedDePage() {
  const liste = document.querySelector(".fr-footer__bottom-list");
  if (!liste) return;
  const item = document.createElement("li");
  item.className = "fr-footer__bottom-item";
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "fr-footer__bottom-link";
  bouton.textContent = libelle();
  bouton.addEventListener("click", () => {
    basculer();
    bouton.textContent = libelle();
  });
  item.appendChild(bouton);
  liste.appendChild(item);
}

function basculer() {
  refus = !refus;
  try {
    if (refus) localStorage.setItem(CLE, "1");
    else localStorage.removeItem(CLE);
  } catch {
    // Stockage indisponible : le choix vaut pour la page en cours.
  }
  abonnes.forEach(prevenir);
}

function prevenir(simulateur) {
  simulateur.postMessage(
    { type: "statistiques-simulateur:choix", suivi: !refus },
    ORIGINE_SIMULATEUR,
  );
}

function libelle() {
  return refus ? LIBELLES.refus : LIBELLES.suivi;
}

function lireRefus() {
  try {
    return localStorage.getItem(CLE) === "1";
  } catch {
    return false;
  }
}

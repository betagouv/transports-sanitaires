// Bloc 1 de la Page Résultat 2 — le verdict : titre et corps propres à chaque cas
// final, dans une alerte DSFR dont la teinte dit déjà l'issue. Ne consulte pas le
// moteur : tout ce qu'il affiche découle du cas final et du transport, déjà
// évalués par `ResultatFinal`.

// Teinte DSFR de l'alerte selon le cas final déterminé par le moteur.
const TEINTE: Record<string, "success" | "info" | "warning" | "error"> = {
  "prescription médicale de transport": "success",
  "demande accord préalable": "info",
  "convocation ou avis audience": "success",
  "transport charge établissement": "warning",
  "prestation non prise en charge par assurance maladie": "error",
  SMUR: "warning",
  "bariatrique seul": "error",
  "permission sortie sans motif médical": "error",
  "non éligible assurance maladie dans ce parcours": "error",
};

export function Bloc1Resultat({
  casFinal,
  transport,
  transportPrescrit,
}: {
  casFinal: string;
  transport: string;
  transportPrescrit: boolean;
}) {
  const teinte = TEINTE[casFinal] ?? "info";

  const contenu = () => {
    switch (casFinal) {
      case "prescription médicale de transport":
        return {
          titre:
            "Vous êtes éligible à une prise en charge par l’Assurance Maladie",
          corps: (
            <>
              <p>
                Transport sanitaire prescrit : <strong>{transport}</strong>.
              </p>
              <p>
                Document à remettre au patient :{" "}
                <strong>Prescription Médicale de Transport</strong>.
              </p>
            </>
          ),
        };
      case "demande accord préalable":
        return {
          titre:
            "Vous êtes éligible sous réserve d’un accord préalable de l’Assurance Maladie",
          corps: (
            <>
              <p>
                Transport sanitaire prescrit : <strong>{transport}</strong>.
              </p>
              <p>
                Document à remettre au patient :{" "}
                <strong>Demande d’Accord Préalable</strong>.
              </p>
            </>
          ),
        };
      case "convocation ou avis audience":
        return {
          titre: "Vous êtes éligible",
          corps: (
            <>
              <p>
                Transport sanitaire prescrit : <strong>{transport}</strong>.
              </p>
              <p>
                Document patient :{" "}
                <strong>convocation ou avis d’audience</strong>.
              </p>
            </>
          ),
        };
      case "transport charge établissement":
        return {
          titre: "Transport à charge de l’établissement de santé",
          corps: (
            <>
              <p>
                Transport sanitaire prescrit : <strong>{transport}</strong>.
              </p>
              <p>
                Le transport doit être organisé ou encadré par l’établissement
                de santé.
              </p>
              <p>
                Document à remettre au patient :{" "}
                <strong>formulaire établissement ou document interne</strong>.
              </p>
            </>
          ),
        };
      case "prestation non prise en charge par assurance maladie":
        return {
          titre:
            "Prestation à l’origine du déplacement non prise en charge par l’Assurance Maladie",
          corps: (
            <>
              <p>
                Transport médicalement retenu : <strong>{transport}</strong>.
              </p>
              <p>
                Aucune Prescription Médicale de Transport ni Demande d’Accord
                Préalable ouvrant droit à une prise en charge ne doit être
                établie dans ce parcours.
              </p>
            </>
          ),
        };
      case "SMUR":
        return {
          titre:
            "Transport par équipe SMUR — Structure Mobile d’Urgence et de Réanimation",
          corps: (
            <>
              <p>
                Transport sanitaire prescrit :{" "}
                <strong>transport par équipe SMUR</strong>.
              </p>
              <p>
                Le transport est organisé dans le cadre de l’urgence médicale,
                par l’équipe médicale ou l’établissement concerné.
              </p>
            </>
          ),
        };
      case "bariatrique seul":
        return {
          titre:
            "Aucun mode de transport n’est éligible à une prise en charge par l’Assurance Maladie au titre du seul motif « bariatrique ».",
          corps: (
            <p>
              Aucun transport sanitaire ne peut être prescrit par votre médecin.
            </p>
          ),
        };
      case "permission sortie sans motif médical":
        return {
          titre:
            "Aucun mode de transport n’est éligible à une prise en charge par l’Assurance Maladie au titre du seul motif « permission de sortie sans motif médical ».",
          corps: <p>Le transport reste à votre charge.</p>,
        };
      case "non éligible assurance maladie dans ce parcours":
        return transportPrescrit
          ? {
              // Variante B — transport prescrit mais non pris en charge ici.
              titre:
                "Vous n’êtes pas éligible à une prise en charge dans ce parcours",
              corps: (
                <>
                  <p>
                    Transport sanitaire prescrit par le médecin :{" "}
                    <strong>{transport}</strong>.
                  </p>
                  <p>Le transport reste à votre charge.</p>
                </>
              ),
            }
          : {
              // Variante A — aucun transport sanitaire prescrit.
              titre:
                "Aucun transport sanitaire ne peut être prescrit par votre médecin.",
              corps: (
                <p>
                  Le transport reste à votre charge si vous décidez de
                  l’organiser.
                </p>
              ),
            };
      default:
        return { titre: casFinal, corps: null };
    }
  };

  const { titre, corps } = contenu();

  return (
    <div
      className={`fr-alert fr-alert--${teinte}`}
      style={{ marginBottom: "2rem" }}
    >
      <h3 className="fr-alert__title">{titre}</h3>
      {corps}
    </div>
  );
}

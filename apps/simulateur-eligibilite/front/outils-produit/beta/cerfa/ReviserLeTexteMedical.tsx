// Le texte médical à réviser, quand il ne tient pas dans la rubrique du CERFA
// (contrat EM-2, TS973-12).
//
// Rien n'est coupé, résumé ni mis en annexe à la place du prescripteur : il
// voit le texte entier, le reformule lui-même, et le texte révisé est mesuré à
// nouveau avant la génération. Ses réponses à la simulation ne changent pas,
// et le résultat reste imprimable.

import { Input } from "@codegouvfr/react-dsfr/Input";
import type { RevisionDuTexteMedical } from "./document";

type Props = {
  revision: RevisionDuTexteMedical;
  /** Le dernier essai a débordé : le texte actuel reste à reformuler. */
  deborde: boolean;
  onChange: (revise: string) => void;
};

export function ReviserLeTexteMedical({ revision, deborde, onChange }: Props) {
  return (
    <div className="fr-mb-2w">
      {deborde ? (
        <div className="fr-alert fr-alert--warning fr-alert--sm fr-mb-2w">
          <h4 className="fr-alert__title">
            Le texte médical ne tient pas dans la rubrique du CERFA
          </h4>
          <p>
            Rien n’est coupé ni mis en annexe. Reformulez le texte ci-dessous,
            puis téléchargez à nouveau : il sera mesuré avant la génération. Vos
            réponses à la simulation ne changent pas.
          </p>
        </div>
      ) : (
        <p className="fr-text--sm">
          Le CERFA porte votre texte révisé, qui tient dans la rubrique.
        </p>
      )}
      <Input
        textArea
        label="Éléments d’ordre médical à reporter sur le CERFA"
        hintText="Composé à partir de la simulation. Seul le document est modifié."
        nativeTextAreaProps={{
          value: revision.revise,
          onChange: (e) => onChange(e.target.value),
          rows: 6,
        }}
      />
    </div>
  );
}

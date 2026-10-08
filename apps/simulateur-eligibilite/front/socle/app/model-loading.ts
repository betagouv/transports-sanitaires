// Le modèle que l'app déroule, qu'il soit déjà là ou qu'il se charge à la
// demande. Le contrat `Model` reste synchrone : seule son arrivée attend.

import { useEffect, useState } from "react";
import type { Model } from "../model";

/** Un modèle, ou sa promesse quand il se charge à la demande. */
export type ModelSource = Model | Promise<Model>;

/** Où en est le chargement. Sans modèle ni échec : il est en cours. */
export type ModelLoading = { model?: Model; failed: boolean };

export function useModelLoading(source: ModelSource): ModelLoading {
  const [loading, setLoading] = useState<ModelLoading>({ failed: false });

  useEffect(() => {
    if (!(source instanceof Promise)) return;
    let current = true;
    source.then(
      (model) => current && setLoading({ model, failed: false }),
      () => current && setLoading({ failed: true }),
    );
    return () => {
      current = false;
    };
  }, [source]);

  return source instanceof Promise ? loading : { model: source, failed: false };
}

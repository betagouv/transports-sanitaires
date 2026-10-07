// Une liste déroulante : le `fr-select` du DSFR.

type Props = {
  id: string;
  label: string;
  /** Option affichée tant que rien n'est sélectionné. */
  placeholder: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
};

export function SelectField(props: Props) {
  return (
    <div className="fr-select-group">
      <label className="fr-label" htmlFor={props.id}>
        {props.label}
      </label>
      <select
        className="fr-select"
        id={props.id}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      >
        <option value="" disabled hidden>
          {props.placeholder}
        </option>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

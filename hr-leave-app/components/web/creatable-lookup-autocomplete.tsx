import React, { useMemo, useState } from 'react';

/**
 * Searchable Autocomplete with "+ Add new" support, backed by one of the
 * three reference tables (departments / nationalities / designations).
 *
 * Behaviour:
 *   - The dropdown lists every active value in the lookup (loaded by the
 *     parent screen via lookupService).
 *   - The user can type freely to filter.
 *   - If the typed value doesn't match any existing item, a synthetic
 *     "+ Add \"<value>\"" option appears at the bottom of the list.
 *     Selecting it calls onCreate (which inserts the row via
 *     lookupService.add*) and then onChange with the canonical name.
 *
 * Canonicalisation happens INSIDE the parent's onCreate handler (it
 * already knows which lookup it's working with). This component just
 * passes the raw string up.
 *
 * Designed to drop into any MUI-using web dialog. Returns null on
 * native — callers should fall back to a plain TextField there.
 */

let Autocomplete: any;
let TextField: any;
let CircularProgress: any;

if (typeof window !== 'undefined') {
  try {
    Autocomplete = require('@mui/material/Autocomplete').default;
    TextField = require('@mui/material/TextField').default;
    CircularProgress = require('@mui/material/CircularProgress').default;
  } catch {
    // Native or SSR — caller falls back.
  }
}

export interface CreatableLookupAutocompleteProps {
  label: string;
  value: string;
  options: string[];
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  onChange: (next: string) => void;
  /**
   * Called when the user picks "+ Add <value>". The handler is expected
   * to insert into the lookup table, then the canonical name should
   * propagate back via onChange.
   */
  onCreate: (raw: string) => Promise<string>;
}

export function CreatableLookupAutocomplete({
  label,
  value,
  options,
  required,
  disabled,
  helperText,
  onChange,
  onCreate,
}: CreatableLookupAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [creating, setCreating] = useState(false);

  // Keep input synced with controlled value
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Build a stable list (options + the synthetic "Add new" entry when
  // there's typed text that isn't in the list).
  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, inputValue]);

  const exactExists = useMemo(
    () => filtered.some((o) => o.toLowerCase() === inputValue.trim().toLowerCase()),
    [filtered, inputValue],
  );

  const showAddNew = inputValue.trim().length > 0 && !exactExists && !disabled;

  if (!Autocomplete) {
    // Native fallback — render the raw value, no creation UI.
    return null;
  }

  const ADD_NEW_PREFIX = '__add_new__:';

  const handleChange = async (_: any, next: string | null) => {
    if (next == null) {
      onChange('');
      return;
    }
    if (next.startsWith(ADD_NEW_PREFIX)) {
      const raw = next.slice(ADD_NEW_PREFIX.length);
      setCreating(true);
      try {
        const canonical = await onCreate(raw);
        onChange(canonical);
        setInputValue(canonical);
      } catch (err: any) {
        // Surface the DB error to the user via the helper text channel;
        // the parent dialog will typically also show a snackbar.
        throw err;
      } finally {
        setCreating(false);
      }
      return;
    }
    onChange(next);
  };

  const renderedOptions = showAddNew
    ? [...filtered, `${ADD_NEW_PREFIX}${inputValue.trim()}`]
    : filtered;

  return (
    <Autocomplete
      options={renderedOptions}
      value={value || null}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={(_: any, v: string) => setInputValue(v)}
      disabled={disabled || creating}
      getOptionLabel={(opt: string) =>
        opt.startsWith(ADD_NEW_PREFIX) ? `+ Add "${opt.slice(ADD_NEW_PREFIX.length)}"` : opt
      }
      isOptionEqualToValue={(opt: string, val: string) => opt === val}
      freeSolo={false}
      renderInput={(params: any) => (
        <TextField
          {...params}
          label={label}
          size="small"
          required={required}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {creating && CircularProgress && <CircularProgress size={16} sx={{ mr: 1 }} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

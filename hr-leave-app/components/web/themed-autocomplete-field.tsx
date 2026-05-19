import React from 'react';
import { useColorScheme } from 'nativewind';
import { requiredSx } from '@/lib/required-field';
import { Input } from '@/components/ui/input';

/**
 * The SAME MUI Autocomplete + theme the HR Edit Employee dialog uses
 * (freeSolo + forcePopupIcon, wrapped in the shared MuiThemeProvider),
 * so registration and HR forms look/behave identically — dark/light
 * follows the app color scheme. Native/SSR falls back to the themed
 * <Input>.
 *
 *   freeSolo=true  → accept a typed value not in the list
 *                    (Nationality, Specialization)
 *   freeSolo=false → pick-only fixed list (Qualification)
 */

let Autocomplete: any;
let TextField: any;
let MuiThemeProvider: any;

if (typeof window !== 'undefined') {
  try {
    Autocomplete = require('@mui/material/Autocomplete').default;
    TextField = require('@mui/material/TextField').default;
    MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  } catch {
    // native / SSR — caller falls back to <Input>
  }
}

export interface ThemedAutocompleteFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: string[];
  required?: boolean;
  /** true: accept typed values; false: pick-only fixed list. */
  freeSolo?: boolean;
  placeholder?: string;
  helper?: string;
  error?: string;
  /** Read-only display (used by the HR review dialog before "Edit"). */
  disabled?: boolean;
}

export function ThemedAutocompleteField({
  label,
  value,
  onChange,
  options,
  required,
  freeSolo = true,
  placeholder,
  helper,
  error,
  disabled = false,
}: ThemedAutocompleteFieldProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!Autocomplete || !MuiThemeProvider) {
    return (
      <Input
        label={label}
        required={required}
        placeholder={placeholder}
        helper={helper}
        value={value || ''}
        onChangeText={onChange}
        error={error}
        editable={!disabled}
      />
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <MuiThemeProvider isDark={isDark}>
        <Autocomplete
          freeSolo={freeSolo}
          forcePopupIcon
          disabled={disabled}
          options={options}
          value={value || null}
          onChange={(_: any, val: string | null) => onChange(val || '')}
          // Only mirror keystrokes when free typing is allowed; for a
          // fixed list we want selection-only (no partial text leaking
          // into the value).
          onInputChange={
            freeSolo ? (_: any, val: string) => onChange(val) : undefined
          }
          fullWidth
          size="small"
          renderInput={(params: any) => (
            <TextField
              {...params}
              label={label}
              size="small"
              required={required}
              placeholder={placeholder}
              error={!!error}
              helperText={error || helper}
              sx={requiredSx(value, !!error)}
            />
          )}
        />
      </MuiThemeProvider>
    </div>
  );
}

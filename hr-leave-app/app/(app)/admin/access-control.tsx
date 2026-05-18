import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Switch, Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/hooks/use-auth';
import { useAccess } from '@/hooks/use-access';
import { accessPolicyService, lookupService } from '@/services';
import { ACCESS_RESOURCES, type AccessResource } from '@/lib/access/resources';
import type { AccessPolicy, AccessRule } from '@/types/models';
import { Role } from '@/types/enums';
import { Button } from '@/components/ui/button';
import { AccessGate } from '@/components/access/access-gate';
import { ScreenHeader } from '@/components/layout/screen-header';

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: Role.Employee, label: 'Employee' },
  { value: Role.Supervisor, label: 'Supervisor' },
  { value: Role.Manager, label: 'Manager' },
  { value: Role.HR, label: 'HR' },
  { value: Role.HRDirector, label: 'HR Director' },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
);

// Plain-language description of exactly who a rule grants, so the
// AND-within-a-rule vs OR-across-rules behaviour is unambiguous.
function summarizeRule(rule: AccessRule): string {
  const parts: string[] = [];
  if (rule.roles?.length)
    parts.push(`role is ${rule.roles.map((r) => ROLE_LABEL[r] ?? r).join(' or ')}`);
  if (rule.departments?.length)
    parts.push(`department is ${rule.departments.join(' or ')}`);
  if (rule.job_titles?.length)
    parts.push(`job title is ${rule.job_titles.join(' or ')}`);
  if (parts.length === 0)
    return 'Empty — pick at least one chip. A fully empty rule is ignored on save.';
  return `Grants access when ${parts.join('  AND  ')}.`;
}

interface Draft {
  visible_to_all: boolean;
  rules: AccessRule[];
}

function draftFromPolicy(p: AccessPolicy | undefined): Draft {
  if (!p) return { visible_to_all: false, rules: [] };
  return {
    visible_to_all: p.visible_to_all,
    rules: Array.isArray(p.rules) ? p.rules.map((r) => ({ ...r })) : [],
  };
}

// ── Chip multi-select ────────────────────────────────────────
function ChipGroup({
  options,
  selected,
  onToggle,
  isDark,
  emptyHint,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  isDark: boolean;
  emptyHint: string;
}) {
  if (options.length === 0) {
    return (
      <Text style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8', fontStyle: 'italic' }}>
        {emptyHint}
      </Text>
    );
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => onToggle(opt)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: on ? '#2563EB' : isDark ? '#334155' : '#CBD5E1',
              backgroundColor: on
                ? isDark
                  ? 'rgba(37,99,235,0.2)'
                  : '#EFF6FF'
                : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: on ? '700' : '500',
                color: on ? '#2563EB' : isDark ? '#CBD5E1' : '#475569',
              }}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── One resource card ────────────────────────────────────────
function ResourceCard({
  resource,
  policy,
  departments,
  jobTitles,
  isDark,
  onSaved,
  userId,
}: {
  resource: AccessResource;
  policy: AccessPolicy | undefined;
  departments: string[];
  jobTitles: string[];
  isDark: boolean;
  onSaved: () => void;
  userId: string;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFromPolicy(policy));
  const [saving, setSaving] = useState(false);

  // Re-sync if the underlying policy changes (e.g. after a reload).
  useEffect(() => {
    setDraft(draftFromPolicy(policy));
  }, [policy]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(draftFromPolicy(policy)),
    [draft, policy],
  );

  const setRule = (idx: number, patch: Partial<AccessRule>) =>
    setDraft((d) => ({
      ...d,
      rules: d.rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));

  const toggleIn = (arr: string[] | undefined, value: string): string[] => {
    const cur = arr ?? [];
    return cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await accessPolicyService.upsert(
        {
          resource_key: resource.key,
          label: resource.label,
          category: resource.category,
          visible_to_all: draft.visible_to_all,
          // Drop fully-empty rules so a stray "Add rule" with no
          // selection doesn't read as "match everyone".
          rules: draft.rules.filter(
            (r) =>
              (r.roles?.length ?? 0) +
                (r.departments?.length ?? 0) +
                (r.job_titles?.length ?? 0) >
              0,
          ),
        },
        userId,
      );
      onSaved();
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert(`Save failed: ${e?.message ?? 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [draft, resource, userId, onSaved]);

  return (
    <View
      style={{
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        borderWidth: 1,
        borderColor: dirty ? '#2563EB' : isDark ? '#334155' : '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F1F5F9' : '#0F172A' }}>
          {resource.label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B' }}>
            Visible to everyone
          </Text>
          <Switch
            value={draft.visible_to_all}
            onValueChange={(v) => setDraft((d) => ({ ...d, visible_to_all: v }))}
          />
        </View>
      </View>

      {!draft.visible_to_all && (
        <View style={{ marginTop: 12, gap: 12 }}>
          <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', lineHeight: 16 }}>
            A person gets access if <Text style={{ fontWeight: '800' }}>ANY rule</Text> matches
            (rules are OR). Inside <Text style={{ fontWeight: '800' }}>one rule</Text>, every
            section you fill must match (AND) — e.g. Role=Manager + Dept=OPERATIONS means
            "managers who are also in Operations".
            {'\n'}👉 To open this to a <Text style={{ fontWeight: '800' }}>whole department regardless of role</Text>,
            put that department in its <Text style={{ fontWeight: '800' }}>own rule</Text> with
            Roles left empty. Add a separate rule for HR.
            {'\n'}Access superusers bypass all rules; HR/HR Director can always reach
            the Access Control screen itself but otherwise follow these rules.
          </Text>

          {draft.rules.length === 0 && (
            <Text style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8', fontStyle: 'italic' }}>
              No rules — only HR / HR Director can reach this.
            </Text>
          )}

          {draft.rules.map((rule, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#94A3B8' : '#64748B' }}>OR</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />
                </View>
              )}
              <View
                style={{
                  borderWidth: 1,
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                  borderRadius: 10,
                  padding: 12,
                  gap: 10,
                }}
              >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#CBD5E1' : '#475569' }}>
                  Rule {idx + 1}
                </Text>
                <Pressable
                  onPress={() =>
                    setDraft((d) => ({ ...d, rules: d.rules.filter((_, i) => i !== idx) }))
                  }
                >
                  <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>Remove</Text>
                </Pressable>
              </View>

              <View
                style={{
                  backgroundColor: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF',
                  borderRadius: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                }}
              >
                <Text style={{ fontSize: 12, color: isDark ? '#93C5FD' : '#1D4ED8', fontWeight: '600' }}>
                  {summarizeRule(rule)}
                </Text>
                <Text style={{ fontSize: 10, color: isDark ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                  All sections you fill below must match (AND). Leave a section empty to not constrain on it.
                </Text>
              </View>

              <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B' }}>
                Roles
              </Text>
              <ChipGroup
                isDark={isDark}
                options={ROLE_OPTIONS.map((r) => r.value)}
                selected={rule.roles ?? []}
                onToggle={(v) => setRule(idx, { roles: toggleIn(rule.roles, v) })}
                emptyHint="—"
              />

              <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B' }}>
                Departments
              </Text>
              <ChipGroup
                isDark={isDark}
                options={departments}
                selected={rule.departments ?? []}
                onToggle={(v) => setRule(idx, { departments: toggleIn(rule.departments, v) })}
                emptyHint="No departments in lookup."
              />

              <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B' }}>
                Job titles
              </Text>
              <ChipGroup
                isDark={isDark}
                options={jobTitles}
                selected={rule.job_titles ?? []}
                onToggle={(v) => setRule(idx, { job_titles: toggleIn(rule.job_titles, v) })}
                emptyHint="No job titles in lookup."
              />
              </View>
            </React.Fragment>
          ))}

          <Pressable
            onPress={() => setDraft((d) => ({ ...d, rules: [...d.rules, {}] }))}
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
          >
            <Text style={{ fontSize: 13, color: '#2563EB', fontWeight: '700' }}>
              + Add another rule (OR — a separate alternative)
            </Text>
          </Pressable>
        </View>
      )}

      {dirty && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Button size="sm" loading={saving} onPress={save}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onPress={() => setDraft(draftFromPolicy(policy))}>
            Discard
          </Button>
        </View>
      )}
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────
function AccessControlInner() {
  const { user } = useAuth();
  const { reload } = useAccess();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [policies, setPolicies] = useState<Record<string, AccessPolicy>>({});
  const [departments, setDepartments] = useState<string[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pol, deps, desigs] = await Promise.all([
        accessPolicyService.listAll(),
        lookupService.getDepartments(),
        lookupService.getDesignations(),
      ]);
      setPolicies(Object.fromEntries(pol.map((p) => [p.resource_key, p])));
      setDepartments(deps.map((d) => d.name));
      setJobTitles(desigs.map((d) => d.name));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSaved = useCallback(() => {
    void load(); // refresh this screen
    void reload(); // refresh the shared store → navbar updates live
  }, [load, reload]);

  const groups: { label: string; items: AccessResource[] }[] = [
    { label: 'Navbar', items: ACCESS_RESOURCES.filter((r) => r.category === 'nav') },
    { label: 'Pages', items: ACCESS_RESOURCES.filter((r) => r.category === 'page') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
      <ScreenHeader title="Access Control" />
      <ScrollView contentContainerStyle={{ padding: 20, maxWidth: 920, alignSelf: 'center', width: '100%' }}>
        <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginBottom: 20 }}>
          Decide who sees each navbar item and page by Role, Department, and Job
          Title. Rules are attribute-based — changing an employee's
          role/department/title re-grants access automatically. Set an
          employee as an Access superuser (Edit Employee → Capabilities) to
          bypass all rules. HR/HR Director can always reach this Access
          Control screen so policies can't be locked out, but otherwise
          follow the rules. This controls navigation & page visibility;
          data security stays enforced by the database.
        </Text>

        {loading ? (
          <Text style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Loading…</Text>
        ) : (
          groups.map((g) => (
            <View key={g.label} style={{ marginBottom: 28 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: isDark ? '#F1F5F9' : '#0F172A',
                  marginBottom: 12,
                }}
              >
                {g.label}
              </Text>
              {g.items.map((r) => (
                <ResourceCard
                  key={r.key}
                  resource={r}
                  policy={policies[r.key]}
                  departments={departments}
                  jobTitles={jobTitles}
                  isDark={isDark}
                  onSaved={onSaved}
                  userId={user?.id ?? ''}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default function AccessControlScreen() {
  return (
    <AccessGate resourceKey="page:admin/access-control">
      <AccessControlInner />
    </AccessGate>
  );
}

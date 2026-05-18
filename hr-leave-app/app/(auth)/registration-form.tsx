import { useEffect, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { registrationService, documentService, userService } from '@/services';
import { supabase } from '@/services/supabase/client';
import { registrationFormSchema, type RegistrationFormSchemaData } from '@/lib/validators';
import { getRoleLabel, formatHours } from '@/lib/utils';
import type { Profile, EmployeeDocument } from '@/types/models';
import { RegistrationStatus } from '@/types/enums';
import { autoOrientImage, rotateImageBlob } from '@/lib/image-rotation';

const isWeb = Platform.OS === 'web';

const ID_TYPE_OPTIONS: { value: 'national_id' | 'iqama' | 'passport'; label: string }[] = [
  { value: 'national_id', label: 'Saudi National ID' },
  { value: 'iqama',       label: 'Iqama (Residence Permit)' },
  { value: 'passport',    label: 'Passport' },
];

export default function RegistrationFormScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [doc, setDoc] = useState<EmployeeDocument | null>(null);
  const [supervisorName, setSupervisorName] = useState<string>('—');
  const [managerName, setManagerName] = useState<string>('—');
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  // Signed URL for the existing/newly-uploaded document so the user
  // can see what HR has on file. Short-lived (10 min) — refetched on
  // bootstrap and after every upload.
  const [docSignedUrl, setDocSignedUrl] = useState<string>('');
  const [docFileType, setDocFileType] = useState<string>('');
  // Display rotation (0/90/180/270). Persisted to storage when the
  // user clicks Save rotation — see handleSaveRotation.
  const [docRotation, setDocRotation] = useState<number>(0);
  const [rotatingSaving, setRotatingSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<RegistrationFormSchemaData>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      email: '',
      full_name: '',
      phone: '',
      nationality: '',
      id_type: 'iqama',
      id_document_url: '',
      national_id_number: '',
      iqama_number: '',
      iqama_expiry: '',
      passport_number: '',
      passport_expiry: '',
      occupation: '',
    },
  });

  const idType = watch('id_type');
  const nationality = watch('nationality');

  // Auto-select national_id for Saudi nationals
  useEffect(() => {
    if (nationality && nationality.toLowerCase().includes('saudi')) {
      setValue('id_type', 'national_id');
    }
  }, [nationality, setValue]);

  // Pre-fill the form from the user's profile + employee_documents row.
  // The employee may have data already if HR added them with details, OR
  // if they're being asked to verify after an existing tenure.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [docRow, employees] = await Promise.all([
          documentService.getMyDocument(user.id).catch(() => null),
          userService.getEmployees().catch(() => [] as Profile[]),
        ]);
        if (cancelled) return;

        if (docRow) setDoc(docRow);

        // Resolve supervisor / manager names for read-only display
        const sup = user.supervisor_id ? employees.find((e: Profile) => e.id === user.supervisor_id) : null;
        const mgr = user.manager_id ? employees.find((e: Profile) => e.id === user.manager_id) : null;
        if (sup) setSupervisorName(`${sup.full_name} (${getRoleLabel(sup.role)})`);
        if (mgr) setManagerName(`${mgr.full_name} (${getRoleLabel(mgr.role)})`);

        // Reset form with the merged data so all controlled inputs reflect it.
        reset({
          email: user.email || '',
          full_name: user.full_name || '',
          phone: user.phone || '',
          nationality: user.nationality || '',
          id_type: (docRow?.id_type as any) || 'iqama',
          id_document_url: docRow?.id_document_url || '',
          national_id_number: docRow?.national_id_number || '',
          iqama_number: docRow?.iqama_number || '',
          iqama_expiry: docRow?.iqama_expiry || '',
          passport_number: docRow?.passport_number || '',
          passport_expiry: docRow?.passport_expiry || '',
          occupation: docRow?.occupation || user.job_title || '',
        });

        if (docRow?.id_document_url) {
          // Strip the path so we can show "uploaded" indicator
          const parts = docRow.id_document_url.split('/');
          const name = parts[parts.length - 1] || 'Uploaded';
          setUploadedFileName(name);
          // Infer content type from the extension so the preview can
          // distinguish image vs PDF without an HTTP HEAD round-trip.
          if (/\.pdf$/i.test(name)) setDocFileType('application/pdf');
          else if (/\.(jpe?g)$/i.test(name)) setDocFileType('image/jpeg');
          else if (/\.png$/i.test(name)) setDocFileType('image/png');
          else if (/\.webp$/i.test(name)) setDocFileType('image/webp');
          else setDocFileType('');
          // Short-lived signed URL — refreshed if the user uploads.
          supabase.storage
            .from('employee-id-documents')
            .createSignedUrl(docRow.id_document_url, 60 * 10)
            .then(({ data }) => { if (data?.signedUrl && !cancelled) setDocSignedUrl(data.signedUrl); })
            .catch(() => { /* preview just won't render */ });
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  // ─── File upload ─────────────────────────────────────────────────
  const handleFilePicked = async (file: File) => {
    if (!user) return;
    setError(null);
    setUploading(true);
    try {
      // Validate type + size
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowed.includes(file.type)) {
        throw new Error('Only PDF, JPG, or PNG files are accepted.');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File is larger than 5 MB.');
      }

      // Auto-orient: phones embed EXIF orientation rather than rotating
      // pixels. Re-encode with the rotation baked in so the stored file
      // looks correct in every viewer (Storage signed URL preview,
      // browsers without EXIF auto-orient, downloaded copies).
      const correctedBlob = await autoOrientImage(file);

      const ext = file.name.split('.').pop() || 'pdf';
      const path = `${user.id}/id-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('employee-id-documents')
        .upload(path, correctedBlob, { upsert: true, contentType: file.type });

      if (uploadErr) throw new Error(uploadErr.message);

      // Save the path (not a signed URL) — HR Pending Registrations will
      // request a fresh signed URL when displaying.
      setValue('id_document_url', path, { shouldValidate: true });
      setUploadedFileName(file.name);
      setDocFileType(file.type);
      // Fresh signed URL so the inline preview shows the new file.
      const { data: signed } = await supabase.storage
        .from('employee-id-documents')
        .createSignedUrl(path, 60 * 10);
      if (signed?.signedUrl) setDocSignedUrl(signed.signedUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Persist the currently-displayed rotation back to Storage. We
   * download the existing file via the signed URL (avoids any
   * authenticated re-download path), rotate the pixels with a
   * canvas, and upload the result over the same Storage path so HR
   * (and every downstream view) sees the corrected orientation
   * without depending on the browser's EXIF auto-orient.
   */
  const handleSaveRotation = async () => {
    if (!user) return;
    const path = watch('id_document_url');
    if (!path || docRotation === 0) return;
    setRotatingSaving(true);
    setError(null);
    try {
      const url = docSignedUrl;
      if (!url) throw new Error('No signed URL to rotate from');
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Could not fetch current file');
      const blob = await resp.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('Rotation is only supported for image files');
      }
      const rotated = await rotateImageBlob(blob, docRotation);
      const { error: upErr } = await supabase.storage
        .from('employee-id-documents')
        .upload(path, rotated, { upsert: true, contentType: blob.type });
      if (upErr) throw new Error(upErr.message);

      // Refresh the signed URL with cache-buster so the preview
      // re-loads the rotated bytes.
      const { data: signed } = await supabase.storage
        .from('employee-id-documents')
        .createSignedUrl(path, 60 * 10);
      if (signed?.signedUrl) setDocSignedUrl(signed.signedUrl);
      setDocRotation(0);
    } catch (err: any) {
      setError(err.message || 'Failed to save rotation');
    } finally {
      setRotatingSaving(false);
    }
  };

  // Focus on the first field with an error when validation fails
  const onError = () => {
    const fieldOrder: (keyof RegistrationFormSchemaData)[] = [
      'email',
      'full_name',
      'phone',
      'nationality',
      'id_type',
      'national_id_number',
      'iqama_number',
      'iqama_expiry',
      'passport_number',
      'passport_expiry',
      'id_document_url',
    ];

    // Find the first field in our order that has an error
    for (const field of fieldOrder) {
      if (errors[field]) {
        setFocus(field);
        break;
      }
    }
  };

  const onSubmit = async (data: RegistrationFormSchemaData) => {
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      // Normalise empty strings → null so the DB doesn't store empty
      // strings for fields the user didn't fill (e.g. iqama_number when
      // they chose passport as their primary ID).
      const blank = (s?: string | null) => (s && s.trim().length > 0 ? s.trim() : null);

      const updatedProfile = await registrationService.submitRegistration(user.id, {
        email: data.email.trim(),
        full_name: data.full_name.trim(),
        phone: data.phone.trim(),
        nationality: data.nationality.trim(),
        id_type: data.id_type,
        id_document_url: data.id_document_url,
        national_id_number: blank(data.national_id_number),
        iqama_number: blank(data.iqama_number),
        iqama_expiry: blank(data.iqama_expiry),
        passport_number: blank(data.passport_number),
        passport_expiry: blank(data.passport_expiry),
        // occupation auto-derives from job_title; falls back to whatever's in doc
        occupation: data.occupation || user.job_title || '',
      });
      setUser(updatedProfile);
      // Force the navigation explicitly. The _layout auth guard normally
      // handles this via a useEffect that watches user.registration_status,
      // but if the persisted store already held 'pending_approval' (e.g.
      // a previous submit, a stale value, an extra render) the dep
      // doesn't change and the effect never re-fires. Calling
      // router.replace here makes the navigation deterministic on every
      // successful submit.
      router.replace('/(auth)/pending-approval' as any);
    } catch (err: any) {
      setError(err.message || 'Failed to submit registration');
    } finally {
      setLoading(false);
    }
  };

  if (!user || bootstrapping) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-slate-900">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-sm text-text-muted dark:text-slate-400 mt-3">
            Loading your profile…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Read-only HR-controlled section ─────────────────────────────
  const hrFields: { label: string; value: string }[] = [
    { label: 'Employee Code',   value: doc?.emp_code || '—' },
    { label: 'Job Title',       value: user.job_title || '—' },
    { label: 'Department',      value: user.department || '—' },
    { label: 'Role',            value: getRoleLabel(user.role) },
    { label: 'Joining Date',    value: user.start_date || '—' },
    { label: 'Workday Hours',   value: `${user.workday_hours ?? 8} hrs` },
    { label: 'Supervisor',      value: supervisorName },
    { label: 'Manager',         value: managerName },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="px-6"
          contentContainerStyle={{ paddingVertical: 24, maxWidth: 720, alignSelf: 'center', width: '100%' }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4">
              <Text className="text-2xl font-bold text-white">HR</Text>
            </View>
            <Text className="text-2xl font-bold text-text-primary dark:text-white">
              {user.registration_status === RegistrationStatus.InfoRejected
                ? 'Update Your Registration'
                : 'Complete Your Registration'}
            </Text>
            <Text className="text-sm text-text-muted dark:text-slate-400 mt-1 text-center">
              {user.registration_status === RegistrationStatus.InfoRejected
                ? 'HR asked you to update some details. Fix the items below and submit again.'
                : 'Verify the information HR added and fill in your personal details. HR will review before your account is activated.'}
            </Text>
          </View>

          {user.registration_status === RegistrationStatus.InfoRejected && (
            <Banner variant="warning" className="mb-4">
              {user.registration_note
                ? `HR comment: ${user.registration_note}`
                : 'HR sent your registration back for changes. Please review and update the fields below.'}
            </Banner>
          )}

          {error && (
            <Banner variant="error" className="mb-4">
              {error}
            </Banner>
          )}

          {/* ─── HR-set info (read-only) ─── */}
          <Text className="text-base font-semibold text-text-primary dark:text-white mb-2">
            Account & Employment Information
          </Text>
          <Text className="text-xs text-text-muted dark:text-slate-400 mb-3">
            Set by HR. If anything is wrong, contact HR — you can't edit these fields.
          </Text>
          <View className="rounded-xl border border-border dark:border-slate-700 bg-white dark:bg-slate-800 p-4 mb-6">
            {hrFields.map((f, i) => (
              <View
                key={f.label}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomWidth: i < hrFields.length - 1 ? 1 : 0,
                  borderBottomColor: '#1E293B',
                }}
              >
                <Text className="text-xs text-text-muted dark:text-slate-400">{f.label}</Text>
                <Text className="text-sm font-medium text-text-primary dark:text-white" numberOfLines={1}>
                  {f.value}
                </Text>
              </View>
            ))}
          </View>

          {/* ─── Personal info (employee fills) ─── */}
          <Text className="text-base font-semibold text-text-primary dark:text-white mb-3">
            Personal Information
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Email Address"
                required
                placeholder="your.email@example.com"
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />

          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Full Name"
                required
                placeholder="Enter your full name"
                value={value}
                onChangeText={onChange}
                error={errors.full_name?.message}
                autoCapitalize="words"
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Phone Number"
                required
                placeholder="+966 5XX XXX XXXX"
                value={value}
                onChangeText={onChange}
                error={errors.phone?.message}
                keyboardType="phone-pad"
              />
            )}
          />

          <Controller
            control={control}
            name="nationality"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Nationality"
                required
                placeholder="e.g. Saudi, Egyptian, Indian"
                value={value}
                onChangeText={onChange}
                error={errors.nationality?.message}
                autoCapitalize="words"
              />
            )}
          />

          {/* ─── Primary identification ─── */}
          <Text className="text-base font-semibold text-text-primary dark:text-white mb-2 mt-6">
            Primary Identification
          </Text>
          <Text className="text-xs text-text-muted dark:text-slate-400 mb-3">
            Choose the document you'll use as your main ID, fill in its number and expiry, and upload a clear scan or photo (PDF, JPG, or PNG, ≤ 5 MB).
          </Text>

          <Controller
            control={control}
            name="id_type"
            render={({ field: { onChange, value } }) => {
              // Filter ID options: Saudi nationals see only National ID
              const isSaudi = nationality && nationality.toLowerCase().includes('saudi');
              const availableIdOptions = isSaudi
                ? ID_TYPE_OPTIONS.filter(opt => opt.value === 'national_id')
                : ID_TYPE_OPTIONS;
              const hasError = !!errors.id_type;

              return (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6, color: isWeb ? '#E2E8F0' : '#0F172A' }}>
                    ID Type
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    gap: 8,
                    flexWrap: 'wrap',
                    padding: 8,
                    borderRadius: 8,
                    borderWidth: hasError ? 1 : 0,
                    borderColor: hasError ? '#EF4444' : 'transparent',
                  }}>
                    {availableIdOptions.map((opt) => {
                      const selected = value === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => onChange(opt.value)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: selected ? '#2563EB' : '#334155',
                            backgroundColor: selected ? 'rgba(37,99,235,0.15)' : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#2563EB' : '#94A3B8' }}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {errors.id_type?.message && (
                    <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                      {errors.id_type.message}
                    </Text>
                  )}
                </View>
              );
            }}
          />

          {/* Conditional ID number + expiry based on id_type */}
          {idType === 'national_id' && (
            <Controller
              control={control}
              name="national_id_number"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="National ID Number"
                  required
                  placeholder="10-digit Saudi National ID"
                  value={value || ''}
                  onChangeText={onChange}
                  error={errors.national_id_number?.message}
                  keyboardType="number-pad"
                />
              )}
            />
          )}

          {idType === 'iqama' && (
            <>
              <Controller
                control={control}
                name="iqama_number"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Iqama Number"
                    required
                    placeholder="Enter your Iqama number"
                    value={value || ''}
                    onChangeText={onChange}
                    error={errors.iqama_number?.message}
                    keyboardType="number-pad"
                  />
                )}
              />
              <Controller
                control={control}
                name="iqama_expiry"
                render={({ field: { onChange, value } }) => (
                  <NativeDateField
                    label="Iqama Expiry Date"
                    value={value || ''}
                    onChange={onChange}
                    error={errors.iqama_expiry?.message}
                  />
                )}
              />
            </>
          )}

          {idType === 'passport' && (
            <>
              <Controller
                control={control}
                name="passport_number"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Passport Number"
                    required
                    placeholder="Enter your passport number"
                    value={value || ''}
                    onChangeText={onChange}
                    error={errors.passport_number?.message}
                    autoCapitalize="characters"
                  />
                )}
              />
              <Controller
                control={control}
                name="passport_expiry"
                render={({ field: { onChange, value } }) => (
                  <NativeDateField
                    label="Passport Expiry Date"
                    value={value || ''}
                    onChange={onChange}
                    error={errors.passport_expiry?.message}
                  />
                )}
              />
            </>
          )}

          {/* File upload */}
          <Controller
            control={control}
            name="id_document_url"
            render={({ field: { value } }) => (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6, color: isWeb ? '#E2E8F0' : '#0F172A' }}>
                  ID Document Upload
                </Text>
                {isWeb ? (
                  <View>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/jpg"
                      onChange={(e: any) => {
                        const f = e.target?.files?.[0];
                        if (f) handleFilePicked(f);
                      }}
                      disabled={uploading}
                      style={{
                        display: 'block',
                        padding: 10,
                        borderRadius: 8,
                        border: errors.id_document_url ? '1px dashed #EF4444' : '1px dashed #334155',
                        backgroundColor: 'transparent',
                        color: '#94A3B8',
                        fontSize: 13,
                        width: '100%',
                      }}
                    />
                    {uploading && (
                      <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Uploading…</Text>
                    )}
                    {!!value && !uploading && (
                      <Text style={{ fontSize: 12, color: '#16A34A', marginTop: 4 }}>
                        ✓ Uploaded: {uploadedFileName}
                      </Text>
                    )}
                    {!!value && !uploading && !!docSignedUrl && (
                      // Inline preview so the user can check what's
                      // currently on file and decide whether to upload
                      // a new one. Image renders directly; PDF surfaces
                      // a clickable card that opens the file in a new
                      // tab (full preview).
                      <View style={{ marginTop: 8 }}>
                        {docFileType === 'application/pdf' ? (
                          <a
                            href={docSignedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: 12,
                              border: '1px solid #334155',
                              borderRadius: 8,
                              textDecoration: 'none',
                              color: '#E2E8F0',
                              backgroundColor: 'rgba(255,255,255,0.02)',
                            }}
                          >
                            <span style={{ fontSize: 22 }}>📄</span>
                            <span style={{ flex: 1, fontSize: 13 }}>
                              <span style={{ fontWeight: 600, color: '#60A5FA' }}>{uploadedFileName}</span>
                              <br />
                              <span style={{ fontSize: 11, opacity: 0.7 }}>Click to open in a new tab</span>
                            </span>
                          </a>
                        ) : (
                          <a
                            href={docSignedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'block',
                              border: '1px solid #334155',
                              borderRadius: 8,
                              overflow: 'hidden',
                              padding: 16,
                              backgroundColor: 'rgba(255,255,255,0.02)',
                            }}
                            title="Click to open full size"
                          >
                            <img
                              src={docSignedUrl}
                              alt={uploadedFileName || 'ID document'}
                              style={{
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: 280,
                                margin: '0 auto',
                                transform: `rotate(${docRotation}deg)`,
                                transition: 'transform 200ms',
                              }}
                            />
                          </a>
                        )}
                        {/* Rotate controls — only for image previews.
                            PDFs don't get a rotation button (the
                            canvas approach can't re-render PDF pages
                            without a heavy dependency). */}
                        {docFileType !== 'application/pdf' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <button
                              type="button"
                              onClick={() => setDocRotation((r) => (r + 90) % 360)}
                              disabled={rotatingSaving}
                              title="Rotate 90° clockwise (preview only — click Save rotation to persist)"
                              style={{
                                padding: '6px 12px',
                                fontSize: 12,
                                fontWeight: 600,
                                border: '1px solid #334155',
                                borderRadius: 6,
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                color: '#E2E8F0',
                                cursor: rotatingSaving ? 'wait' : 'pointer',
                              }}
                            >
                              ⟲ Rotate 90°
                            </button>
                            {docRotation !== 0 && (
                              <>
                                <button
                                  type="button"
                                  onClick={handleSaveRotation}
                                  disabled={rotatingSaving}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    border: 'none',
                                    borderRadius: 6,
                                    backgroundColor: rotatingSaving ? '#94A3B8' : '#16A34A',
                                    color: '#FFFFFF',
                                    cursor: rotatingSaving ? 'wait' : 'pointer',
                                  }}
                                >
                                  {rotatingSaving ? 'Saving…' : 'Save rotation'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDocRotation(0)}
                                  disabled={rotatingSaving}
                                  style={{
                                    padding: '6px 8px',
                                    fontSize: 12,
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#94A3B8',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Reset
                                </button>
                              </>
                            )}
                          </View>
                        )}
                        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                          This is the document HR currently has on file. Upload a new file above to replace it.
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={{ fontSize: 13, color: '#94A3B8' }}>
                    Open this page in a web browser to upload your ID document. (Mobile upload coming.)
                  </Text>
                )}
                {errors.id_document_url?.message && (
                  <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                    {errors.id_document_url.message}
                  </Text>
                )}
              </View>
            )}
          />

          <View className="mt-6 mb-4">
            <Button onPress={handleSubmit(onSubmit, onError)} loading={loading} fullWidth>
              Submit for HR Approval
            </Button>
          </View>

          {/* Bypass for info_rejected users: they can defer the rework
              and finish later. PendingInfo employees stay locked to the
              form (no link) because they haven't submitted anything yet. */}
          {user.registration_status === RegistrationStatus.InfoRejected && (
            <Pressable
              onPress={() => router.replace('/(app)/(tabs)/dashboard' as any)}
              className="mb-4"
            >
              <Text className="text-sm font-semibold text-primary text-center">
                Continue to dashboard &mdash; I'll come back to this
              </Text>
            </Pressable>
          )}

          <Button onPress={signOut} variant="ghost" fullWidth>
            Sign Out
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Single-date field — HTML5 input on web, simple text input on mobile ─
//
// The existing <DatePicker /> in components/ui is a date-RANGE picker for
// PTO requests; doesn't work for single dates. This component is a clean
// drop-in replacement specifically for the registration form.
function NativeDateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  if (isWeb) {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 6, color: '#E2E8F0' }}>
          {label}
        </Text>
        <input
          type="date"
          value={value || ''}
          onChange={(e: any) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${error ? '#EF4444' : '#334155'}`,
            backgroundColor: '#1E293B',
            color: '#E2E8F0',
            fontSize: 14,
            outline: 'none',
          }}
        />
        {error && (
          <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{error}</Text>
        )}
      </View>
    );
  }

  // Mobile fallback — text input expecting YYYY-MM-DD. Native picker
  // can be added later (react-native-date-picker etc).
  return (
    <Input
      label={label}
      placeholder="YYYY-MM-DD"
      value={value || ''}
      onChangeText={onChange}
      error={error}
    />
  );
}

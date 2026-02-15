import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExcessDetermination } from '@/types/enums';
import { formatHours } from '@/lib/utils';

interface ExcessDeterminationProps {
  excessHours: number;
  onDetermine: (determination: ExcessDetermination, comment?: string) => Promise<void>;
}

export function ExcessDeterminationPanel({ excessHours, onDetermine }: ExcessDeterminationProps) {
  const [selected, setSelected] = useState<ExcessDetermination>(ExcessDetermination.Unpaid);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const options = [
    {
      value: ExcessDetermination.Unpaid,
      label: 'Confirm Unpaid (Default)',
      desc: 'Excess hours will be marked as unpaid leave.',
    },
    {
      value: ExcessDetermination.Converted,
      label: 'Convert to Another Category',
      desc: 'Reclassify excess hours (e.g., comp time, sick).',
    },
    {
      value: ExcessDetermination.PartialReject,
      label: 'Reject Excess Portion',
      desc: 'Approve paid hours only, reject the excess.',
    },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onDetermine(selected, comment || undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-warning bg-warning-light/30 mb-4">
      <Text className="text-base font-semibold text-text-primary dark:text-white mb-1">
        Excess Determination Required
      </Text>
      <Text className="text-sm text-text-muted dark:text-slate-400 mb-3">
        This request has {formatHours(excessHours)} excess beyond the employee's balance.
      </Text>

      {options.map((opt) => (
        <View
          key={opt.value}
          className={`mb-2 rounded-xl border p-3 ${
            selected === opt.value ? 'border-primary bg-primary-light' : 'border-border dark:border-slate-600 bg-surface dark:bg-slate-800'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              selected === opt.value ? 'text-primary' : 'text-text-primary dark:text-white'
            }`}
            onPress={() => setSelected(opt.value)}
          >
            {opt.label}
          </Text>
          <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">{opt.desc}</Text>
        </View>
      ))}

      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Add a note (optional)"
        className="border border-border dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-text-primary dark:text-white bg-surface dark:bg-slate-800 mt-2 mb-3"
        placeholderTextColor="#94A3B8"
      />

      <Button onPress={handleSubmit} loading={loading} fullWidth>
        Confirm Determination
      </Button>
    </Card>
  );
}

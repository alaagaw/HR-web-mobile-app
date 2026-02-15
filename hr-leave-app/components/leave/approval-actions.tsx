import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Button } from '@/components/ui/button';
import { MAX_COMMENT_LENGTH } from '@/lib/constants';

interface ApprovalActionsProps {
  onApprove: (comment?: string) => Promise<void>;
  onReject: (comment: string) => Promise<void>;
  loading?: boolean;
}

export function ApprovalActions({ onApprove, onReject, loading = false }: ApprovalActionsProps) {
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    if (mode !== 'approve') {
      setMode('approve');
      return;
    }
    setIsSubmitting(true);
    try {
      await onApprove(comment || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (mode !== 'reject') {
      setMode('reject');
      return;
    }
    if (!comment.trim()) return;
    setIsSubmitting(true);
    try {
      await onReject(comment);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="border-t border-border dark:border-slate-700 pt-4 mt-4">
      {/* Comment field (shown when approve/reject clicked) */}
      {mode !== 'idle' && (
        <View className="mb-3">
          <Text className="text-sm font-medium text-text-primary dark:text-white mb-1.5">
            {mode === 'reject' ? 'Reason for Rejection (required)' : 'Comment (optional)'}
          </Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={
              mode === 'reject' ? 'Please provide a reason...' : 'Add a comment...'
            }
            multiline
            numberOfLines={3}
            maxLength={MAX_COMMENT_LENGTH}
            className="border border-border dark:border-slate-600 rounded-xl px-4 py-3 text-base text-text-primary dark:text-white bg-surface dark:bg-slate-800 min-h-[80px]"
            placeholderTextColor="#94A3B8"
            textAlignVertical="top"
          />
          <Text className="text-xs text-text-light mt-1 text-right">
            {comment.length}/{MAX_COMMENT_LENGTH}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View className="flex-row gap-3">
        {mode === 'reject' ? (
          <>
            <View className="flex-1">
              <Button
                variant="ghost"
                onPress={() => {
                  setMode('idle');
                  setComment('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="destructive"
                onPress={handleReject}
                loading={isSubmitting}
                disabled={!comment.trim()}
                fullWidth
              >
                Confirm Reject
              </Button>
            </View>
          </>
        ) : mode === 'approve' ? (
          <>
            <View className="flex-1">
              <Button
                variant="ghost"
                onPress={() => {
                  setMode('idle');
                  setComment('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </View>
            <View className="flex-1">
              <Button
                onPress={handleApprove}
                loading={isSubmitting}
                fullWidth
              >
                Confirm Approve
              </Button>
            </View>
          </>
        ) : (
          <>
            <View className="flex-1">
              <Button
                variant="destructive"
                onPress={handleReject}
                disabled={loading}
                fullWidth
              >
                Reject
              </Button>
            </View>
            <View className="flex-1">
              <Button
                onPress={handleApprove}
                disabled={loading}
                fullWidth
              >
                Approve
              </Button>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

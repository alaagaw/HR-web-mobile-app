import React from 'react';
import { FlatList, View, Text, Pressable, type ListRenderItem } from 'react-native';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

/** One label/value row inside a card. `value` should be text-like
 *  (string/number); use `right` on the card for chips/badges/buttons. */
export interface CardRow {
  label: string;
  value: React.ReactNode;
}

export interface MobileCardListProps<T> {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  /** Primary line (bold). Keep it text — it renders inside <Text>. */
  title: (item: T) => React.ReactNode;
  /** Optional muted second line under the title. */
  subtitle?: (item: T) => React.ReactNode;
  /** Optional element on the right of the header row (badge / amount / button). */
  right?: (item: T) => React.ReactNode;
  /** Label/value rows shown in the card body. */
  rows?: (item: T) => CardRow[];
  /** Tapping the card. Omit for non-interactive cards. */
  onPress?: (item: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  ListHeaderComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
}

/**
 * Shared mobile list: renders each row as a stacked card (title +
 * optional subtitle/right + label/value rows). Matches the existing
 * hand-rolled Card/FlatList pattern used across the mobile layouts, so
 * pages that only had a desktop DataGrid can get a consistent mobile
 * view below the 1200px breakpoint. See [[project_mobile_responsive]].
 */
export function MobileCardList<T>({
  data,
  keyExtractor,
  title,
  subtitle,
  right,
  rows,
  onPress,
  loading,
  emptyTitle = 'Nothing here',
  emptyDescription,
  ListHeaderComponent,
  ListFooterComponent,
}: MobileCardListProps<T>) {
  const renderItem: ListRenderItem<T> = ({ item }) => {
    const body = (
      <Card className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-sm font-semibold text-text-primary dark:text-white">
              {title(item)}
            </Text>
            {subtitle && (
              <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
                {subtitle(item)}
              </Text>
            )}
          </View>
          {right && <View className="items-end">{right(item)}</View>}
        </View>

        {rows && (
          <View className="mt-2">
            {rows(item).map((r, i) => (
              <View key={`${r.label}-${i}`} className="flex-row justify-between py-0.5">
                <Text className="text-xs text-text-muted dark:text-slate-400">{r.label}</Text>
                <Text className="text-xs font-medium text-text-primary dark:text-slate-200 text-right ml-2 flex-1">
                  {r.value}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    );

    return onPress ? (
      <Pressable onPress={() => onPress(item)} className="active:opacity-70">
        {body}
      </Pressable>
    ) : (
      body
    );
  };

  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={
        !loading ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null
      }
    />
  );
}

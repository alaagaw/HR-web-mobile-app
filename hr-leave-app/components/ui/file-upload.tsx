import { View, Text, Pressable, Image } from 'react-native';
import { Paperclip, X, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { formatFileSize } from '@/lib/utils';
import { MAX_FILE_SIZE_BYTES, ALLOWED_FILE_TYPES } from '@/lib/constants';

interface FileItem {
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface FileUploadProps {
  files: FileItem[];
  onFilesChange: (files: FileItem[]) => void;
  maxFiles?: number;
  label?: string;
  error?: string;
}

export function FileUpload({
  files,
  onFilesChange,
  maxFiles = 5,
  label,
  error,
}: FileUploadProps) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const file: FileItem = {
        uri: asset.uri,
        name: asset.fileName || `image-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 0,
      };

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return; // Could show an error
      }

      onFilesChange([...files, file]);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_FILE_TYPES,
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const file: FileItem = {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
      };

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return;
      }

      onFilesChange([...files, file]);
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const isImage = (type: string) => type.startsWith('image/');
  const canAddMore = files.length < maxFiles;

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-text-primary mb-1.5">{label}</Text>
      )}

      {/* File list */}
      {files.map((file, index) => (
        <View key={index} className="flex-row items-center bg-gray-50 rounded-lg p-3 mb-2 border border-border">
          {isImage(file.type) ? (
            <Image source={{ uri: file.uri }} className="w-10 h-10 rounded-lg mr-3" />
          ) : (
            <View className="w-10 h-10 rounded-lg bg-gray-200 items-center justify-center mr-3">
              <FileText size={20} color="#64748B" />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-sm text-text-primary" numberOfLines={1}>{file.name}</Text>
            <Text className="text-xs text-text-muted">{formatFileSize(file.size)}</Text>
          </View>
          <Pressable onPress={() => removeFile(index)} className="p-1">
            <X size={18} color="#DC2626" />
          </Pressable>
        </View>
      ))}

      {/* Add buttons */}
      {canAddMore && (
        <View className="flex-row gap-3">
          <Pressable
            onPress={pickImage}
            className="flex-1 flex-row items-center justify-center gap-2 border border-dashed border-border rounded-xl py-3"
          >
            <Paperclip size={16} color="#64748B" />
            <Text className="text-sm text-text-muted">Image</Text>
          </Pressable>
          <Pressable
            onPress={pickDocument}
            className="flex-1 flex-row items-center justify-center gap-2 border border-dashed border-border rounded-xl py-3"
          >
            <FileText size={16} color="#64748B" />
            <Text className="text-sm text-text-muted">Document</Text>
          </Pressable>
        </View>
      )}

      {error && <Text className="text-sm text-error mt-1">{error}</Text>}
    </View>
  );
}

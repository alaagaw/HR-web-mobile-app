import { useState, useCallback } from 'react';
import { View, Text, Modal, Pressable, Platform, StyleSheet } from 'react-native';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import type { Attachment } from '@/types/models';

interface FilePreviewModalProps {
  visible: boolean;
  attachment: Attachment | null;
  onClose: () => void;
}

export function FilePreviewModal({ visible, attachment, onClose }: FilePreviewModalProps) {
  if (!attachment) return null;

  const isImage = attachment.file_type?.startsWith('image/');
  const isPdf = attachment.file_type === 'application/pdf';

  // PDFs on mobile: open in-app browser (has native zoom)
  if (!isImage && Platform.OS !== 'web') {
    if (visible) {
      WebBrowser.openBrowserAsync(attachment.file_url).then(onClose);
    }
    return null;
  }

  if (Platform.OS === 'web') {
    return (
      <WebPreviewModal
        visible={visible}
        attachment={attachment}
        isImage={isImage}
        isPdf={isPdf}
        onClose={onClose}
      />
    );
  }

  // Mobile image preview: use react-native-image-viewing
  return (
    <MobileImagePreview
      visible={visible}
      attachment={attachment}
      onClose={onClose}
    />
  );
}

// ── Mobile Image Preview (pinch-to-zoom via react-native-image-viewing) ──

function MobileImagePreview({
  visible,
  attachment,
  onClose,
}: {
  visible: boolean;
  attachment: Attachment;
  onClose: () => void;
}) {
  // Imported via platform-specific files (.native.tsx / .tsx)
  // so the web bundler never touches react-native-image-viewing
  const { NativeImageViewer } = require('./native-image-viewer');

  return (
    <NativeImageViewer
      images={[{ uri: attachment.file_url }]}
      imageIndex={0}
      visible={visible}
      onRequestClose={onClose}
      HeaderComponent={() => (
        <View style={styles.mobileHeader}>
          <Text style={styles.mobileHeaderTitle} numberOfLines={1}>
            {attachment.file_name}
          </Text>
          <Pressable onPress={onClose} style={styles.mobileCloseBtn}>
            <X size={24} color="#fff" />
          </Pressable>
        </View>
      )}
    />
  );
}

// ── Web Preview (images + PDFs with zoom controls) ──

function WebPreviewModal({
  visible,
  attachment,
  isImage,
  isPdf,
  onClose,
}: {
  visible: boolean;
  attachment: Attachment;
  isImage: boolean;
  isPdf: boolean;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 4)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 0.25)), []);
  const handleReset = useCallback(() => setZoom(1), []);

  const handleClose = useCallback(() => {
    setZoom(1);
    onClose();
  }, [onClose]);

  const handleDownload = useCallback(() => {
    window.open(attachment.file_url, '_blank');
  }, [attachment.file_url]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.webOverlay}>
        {/* Top bar */}
        <View style={styles.webTopBar}>
          <Text style={styles.webFileName} numberOfLines={1}>
            {attachment.file_name}
          </Text>
          <View style={styles.webControls}>
            {isImage && (
              <>
                <Pressable onPress={handleZoomOut} style={styles.webControlBtn}>
                  <ZoomOut size={20} color="#fff" />
                </Pressable>
                <Pressable onPress={handleReset}>
                  <Text style={styles.webZoomText}>{Math.round(zoom * 100)}%</Text>
                </Pressable>
                <Pressable onPress={handleZoomIn} style={styles.webControlBtn}>
                  <ZoomIn size={20} color="#fff" />
                </Pressable>
              </>
            )}
            <Pressable onPress={handleDownload} style={styles.webControlBtn}>
              <Download size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={handleClose} style={styles.webControlBtn}>
              <X size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Content area */}
        <Pressable style={styles.webContentArea} onPress={handleClose}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            {isImage && (
              <img
                src={attachment.file_url}
                alt={attachment.file_name}
                style={{
                  maxWidth: '90vw',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  transform: `scale(${zoom})`,
                  transition: 'transform 0.2s ease',
                  borderRadius: 8,
                }}
              />
            )}
            {isPdf && (
              <iframe
                src={attachment.file_url}
                title={attachment.file_name}
                style={{
                  width: '85vw',
                  height: '85vh',
                  border: 'none',
                  borderRadius: 8,
                  backgroundColor: '#fff',
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Mobile
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  mobileHeaderTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  mobileCloseBtn: {
    padding: 8,
  },
  // Web
  webOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  webTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  webFileName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  webControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webControlBtn: {
    padding: 8,
    borderRadius: 8,
  },
  webZoomText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    minWidth: 48,
    textAlign: 'center',
  },
  webContentArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

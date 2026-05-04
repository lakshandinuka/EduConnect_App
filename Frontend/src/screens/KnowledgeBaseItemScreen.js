import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import {
  downloadKBPDFToFile,
  getKBItem,
  getRelatedKBItems,
  submitKBFeedback,
} from '../services/knowledgeBaseService';

const stripHtml = (value = '') => String(value)
  .replace(/<\/(p|div|h1|h2|h3|li)>/gi, '\n')
  .replace(/<li>/gi, '- ')
  .replace(/<[^>]+>/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const RelatedCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.relatedCard} onPress={onPress}>
    <Text style={styles.relatedTitle}>{item.title}</Text>
    <Text style={styles.relatedMeta}>{item.category?.name || 'General'} - {item.type}</Text>
  </TouchableOpacity>
);

const KnowledgeBaseItemScreen = ({ route, navigation }) => {
  const { itemId } = route.params;
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    load();
  }, [itemId]);

  const load = async () => {
    try {
      setLoading(true);
      const [itemData, relatedData] = await Promise.all([
        getKBItem(itemId),
        getRelatedKBItems(itemId),
      ]);
      setItem(itemData);
      setRelated(Array.isArray(relatedData) ? relatedData : []);
      navigation.setOptions({ title: itemData.type === 'PDF' ? 'PDF' : 'Article' });
    } catch (error) {
      Alert.alert('Error', 'Failed to load knowledgebase item');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!item) return;
    setDownloading(true);
    try {
      const result = await downloadKBPDFToFile(item);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: item.title });
      } else {
        Alert.alert('Downloaded', result.uri);
      }
    } catch (error) {
      console.error('KB PDF download error:', error);
      const message = error.status === 404
        ? 'PDF file was not found. Please ask an admin to re-upload it.'
        : 'Failed to download PDF';
      Alert.alert('Error', message);
    } finally {
      setDownloading(false);
    }
  };

  const sendFeedback = async () => {
    try {
      await submitKBFeedback(item.id, { helpful: true });
      setFeedbackSent(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback');
    }
  };

  if (loading || !item) return <View style={styles.centered}><ActivityIndicator size="large" color="#3498DB" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.category?.name || 'General'} - {item.type}</Text>
          </View>
          <View style={styles.typeIcon}>
            <Ionicons name={item.type === 'PDF' ? 'document-text-outline' : 'reader-outline'} size={24} color="#3498DB" />
          </View>
        </View>
        {!!item.description && <Text style={styles.description}>{item.description}</Text>}

        {item.type === 'PDF' ? (
          <View style={styles.pdfBox}>
            <Ionicons name="document-attach-outline" size={36} color="#E74C3C" />
            <Text style={styles.pdfTitle}>PDF knowledgebase item</Text>
            <Text style={styles.pdfText}>Download or share this PDF from your device.</Text>
            <TouchableOpacity style={styles.pdfButton} onPress={downloadPdf} disabled={downloading}>
              {downloading ? <ActivityIndicator color="#FFF" /> : <Ionicons name="download-outline" size={20} color="#FFF" />}
              <Text style={styles.pdfButtonText}>{downloading ? 'Preparing...' : 'Open PDF'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.contentText}>{stripHtml(item.content || 'No content available.')}</Text>
        )}
      </View>

      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackTitle}>Was this helpful?</Text>
        {feedbackSent ? (
          <Text style={styles.feedbackThanks}>Thanks for the feedback.</Text>
        ) : (
          <TouchableOpacity style={styles.feedbackButton} onPress={sendFeedback}>
            <Ionicons name="thumbs-up-outline" size={18} color="#FFF" />
            <Text style={styles.feedbackButtonText}>Yes, this helped</Text>
          </TouchableOpacity>
        )}
      </View>

      {related.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.sectionTitle}>Related Articles</Text>
          {related.map((relatedItem) => (
            <RelatedCard
              key={relatedItem.id}
              item={relatedItem}
              onPress={() => navigation.push('KnowledgeBaseItem', { itemId: relatedItem.id })}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 100 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleWrap: { flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50', lineHeight: 29 },
  meta: { marginTop: 8, color: '#3498DB', fontWeight: 'bold', fontSize: 12 },
  typeIcon: { backgroundColor: '#EBF5FB', borderRadius: 12, padding: 10 },
  description: { color: '#7F8C8D', marginTop: 16, lineHeight: 21 },
  contentText: { color: '#34495E', fontSize: 15, lineHeight: 24, marginTop: 18 },
  pdfBox: { backgroundColor: '#FDEDEC', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 20 },
  pdfTitle: { color: '#2C3E50', fontSize: 16, fontWeight: 'bold', marginTop: 8 },
  pdfText: { color: '#7F8C8D', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  pdfButton: { backgroundColor: '#E74C3C', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pdfButtonText: { color: '#FFF', fontWeight: 'bold' },
  feedbackCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feedbackTitle: { color: '#2C3E50', fontWeight: 'bold', flex: 1 },
  feedbackThanks: { color: '#27AE60', fontWeight: 'bold' },
  feedbackButton: { backgroundColor: '#27AE60', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  feedbackButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  relatedSection: { marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#7F8C8D', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  relatedCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, marginBottom: 10 },
  relatedTitle: { color: '#2C3E50', fontWeight: 'bold' },
  relatedMeta: { color: '#3498DB', fontWeight: 'bold', fontSize: 12, marginTop: 4 },
});

export default KnowledgeBaseItemScreen;

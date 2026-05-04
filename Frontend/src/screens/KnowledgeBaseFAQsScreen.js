import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getKBFAQs } from '../services/knowledgeBaseService';

const KnowledgeBaseFAQsScreen = ({ route }) => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(route.params?.faqId || null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getKBFAQs();
        setFaqs(Array.isArray(data) ? data : []);
      } catch (error) {
        Alert.alert('Error', 'Failed to load FAQs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (route.params?.faqId) setOpenId(route.params.faqId);
  }, [route.params?.faqId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((faq) =>
      (faq.question || '').toLowerCase().includes(q)
      || (faq.answer || '').toLowerCase().includes(q)
      || (faq.category || '').toLowerCase().includes(q)
    );
  }, [faqs, query]);

  const renderItem = ({ item }) => {
    const id = item.id || item._id;
    const isOpen = openId === id;
    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.questionRow} onPress={() => setOpenId(isOpen ? null : id)}>
          <View style={styles.questionTextWrap}>
            <Text style={styles.question}>{item.question}</Text>
            <Text style={styles.category}>{item.category || 'General'}</Text>
          </View>
          <Ionicons name={isOpen ? 'remove-circle-outline' : 'add-circle-outline'} size={22} color="#3498DB" />
        </TouchableOpacity>
        {isOpen && <Text style={styles.answer}>{item.answer}</Text>}
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#3498DB" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#7F8C8D" />
        <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Search FAQs" />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No FAQs available yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { margin: 16, marginBottom: 0, backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E6ED' },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15 },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  questionRow: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  questionTextWrap: { flex: 1 },
  question: { color: '#2C3E50', fontWeight: 'bold', fontSize: 15 },
  category: { color: '#3498DB', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  answer: { color: '#34495E', lineHeight: 21, paddingHorizontal: 16, paddingBottom: 16 },
  empty: { textAlign: 'center', color: '#7F8C8D', marginTop: 30 },
});

export default KnowledgeBaseFAQsScreen;

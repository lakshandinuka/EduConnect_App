import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getKBCategories,
  getKBHome,
  getKBItems,
} from '../services/knowledgeBaseService';

const ItemCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.itemCard} onPress={onPress}>
    <View style={styles.itemIcon}>
      <Ionicons name={item.type === 'PDF' ? 'document-text-outline' : 'reader-outline'} size={22} color="#3498DB" />
    </View>
    <View style={styles.itemBody}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemMeta}>{item.category?.name || 'General'} - {item.type}</Text>
      {!!item.description && <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={18} color="#BDC3C7" />
  </TouchableOpacity>
);

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const KnowledgeBaseHomeScreen = ({ navigation }) => {
  const [home, setHome] = useState({ recommended: [], trending: [], featured: [] });
  const [categories, setCategories] = useState([]);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isFiltered = Boolean(query.trim() || selectedCategory);

  const load = async () => {
    try {
      const [homeData, categoryData] = await Promise.all([getKBHome(), getKBCategories()]);
      setHome(homeData);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load knowledgebase');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const runSearch = async () => {
      if (!isFiltered) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const data = await getKBItems({
          q: query.trim(),
          categoryId: selectedCategory?.id,
        });
        setResults(data.items || []);
      } catch (error) {
        Alert.alert('Error', 'Search failed');
      } finally {
        setSearching(false);
      }
    };

    const timeout = setTimeout(runSearch, 250);
    return () => clearTimeout(timeout);
  }, [query, selectedCategory]);

  const allHomeItems = useMemo(() => {
    const merged = [...home.recommended, ...home.featured, ...home.trending];
    const seen = new Set();
    return merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [home]);

  const openItem = (item) => navigation.navigate('KnowledgeBaseItem', { itemId: item.id });

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#3498DB" /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={19} color="#7F8C8D" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search articles and PDFs"
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color="#BDC3C7" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRail}>
        <TouchableOpacity
          style={[styles.categoryPill, !selectedCategory && styles.categoryPillActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryPillText, !selectedCategory && styles.categoryPillTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((category) => {
          const active = selectedCategory?.id === category.id;
          return (
            <TouchableOpacity
              key={category.id || category._id}
              style={[styles.categoryPill, active && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>
                {category.name} ({category.itemCount || 0})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.faqCard} onPress={() => navigation.navigate('KnowledgeBaseFAQs')}>
        <View style={styles.faqIcon}>
          <Ionicons name="help-circle-outline" size={24} color="#FFF" />
        </View>
        <View style={styles.itemBody}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          <Text style={styles.faqText}>Quick answers to common student support questions.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#FFF" />
      </TouchableOpacity>

      {isFiltered ? (
        <Section title={searching ? 'Searching...' : `Results (${results.length})`}>
          {results.map((item) => <ItemCard key={item.id} item={item} onPress={() => openItem(item)} />)}
          {!searching && results.length === 0 && <Text style={styles.empty}>No matching knowledgebase items.</Text>}
        </Section>
      ) : (
        <>
          <Section title="Recommended">
            {home.recommended.map((item) => <ItemCard key={item.id} item={item} onPress={() => openItem(item)} />)}
            {home.recommended.length === 0 && <Text style={styles.empty}>No recommendations yet.</Text>}
          </Section>

          <Section title="Featured">
            {home.featured.map((item) => <ItemCard key={item.id} item={item} onPress={() => openItem(item)} />)}
            {home.featured.length === 0 && <Text style={styles.empty}>No featured items yet.</Text>}
          </Section>

          <Section title="Recently Updated">
            {(home.trending.length ? home.trending : allHomeItems).map((item) => <ItemCard key={item.id} item={item} onPress={() => openItem(item)} />)}
            {home.trending.length === 0 && allHomeItems.length === 0 && <Text style={styles.empty}>No published items yet.</Text>}
          </Section>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 100 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E6ED',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15 },
  categoryRail: { marginVertical: 14 },
  categoryPill: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE6EF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  categoryPillActive: { backgroundColor: '#3498DB', borderColor: '#3498DB' },
  categoryPillText: { color: '#34495E', fontWeight: '700', fontSize: 12 },
  categoryPillTextActive: { color: '#FFF' },
  faqCard: {
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  faqIcon: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 10, marginRight: 12 },
  faqTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  faqText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#7F8C8D', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemIcon: { backgroundColor: '#EBF5FB', padding: 10, borderRadius: 10, marginRight: 12 },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50' },
  itemMeta: { fontSize: 12, color: '#3498DB', fontWeight: 'bold', marginTop: 3 },
  itemDesc: { color: '#7F8C8D', fontSize: 13, marginTop: 5, lineHeight: 18 },
  empty: { textAlign: 'center', color: '#7F8C8D', marginVertical: 16 },
});

export default KnowledgeBaseHomeScreen;

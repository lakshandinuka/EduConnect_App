import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  archiveKBItem,
  deleteKBItem,
  getAdminKBItems,
  publishKBItem,
  unarchiveKBItem,
  unpublishKBItem,
} from '../services/knowledgeBaseService';

const statusColor = (status) => {
  switch (status) {
    case 'PUBLISHED': return '#27AE60';
    case 'ARCHIVED': return '#7F8C8D';
    default: return '#F39C12';
  }
};

const ManageKBArticlesScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = async () => {
    try {
      const data = await getAdminKBItems();
      setItems(data.items || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load knowledgebase items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchItems);
    return unsubscribe;
  }, [navigation]);

  const confirmDelete = (item) => {
    Alert.alert('Delete Item', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteKBItem(item.id);
            fetchItems();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const setStatus = async (item, nextStatus) => {
    try {
      if (nextStatus === 'PUBLISHED') await publishKBItem(item.id);
      if (nextStatus === 'DRAFT') await unpublishKBItem(item.id);
      if (nextStatus === 'ARCHIVED') await archiveKBItem(item.id);
      if (nextStatus === 'RESTORE') await unarchiveKBItem(item.id);
      fetchItems();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{item.title || 'Untitled'}</Text>
          <Text style={styles.meta}>
            {item.category?.name || 'General'} - {item.type || 'ARTICLE'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor(item.status) }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>

      {!!item.description && <Text style={styles.description} numberOfLines={2}>{item.description}</Text>}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('CreateEditKBItem', { itemId: item.id })}
        >
          <Ionicons name="create-outline" size={18} color="#2C3E50" />
          <Text style={styles.iconText}>Edit</Text>
        </TouchableOpacity>

        {item.status === 'PUBLISHED' ? (
          <TouchableOpacity style={styles.iconButton} onPress={() => setStatus(item, 'DRAFT')}>
            <Ionicons name="eye-off-outline" size={18} color="#F39C12" />
            <Text style={styles.iconText}>Draft</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.iconButton} onPress={() => setStatus(item, item.status === 'ARCHIVED' ? 'RESTORE' : 'PUBLISHED')}>
            <Ionicons name="cloud-upload-outline" size={18} color="#27AE60" />
            <Text style={styles.iconText}>{item.status === 'ARCHIVED' ? 'Restore' : 'Publish'}</Text>
          </TouchableOpacity>
        )}

        {item.status !== 'ARCHIVED' && (
          <TouchableOpacity style={styles.iconButton} onPress={() => setStatus(item, 'ARCHIVED')}>
            <Ionicons name="archive-outline" size={18} color="#7F8C8D" />
            <Text style={styles.iconText}>Archive</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.iconButton} onPress={() => confirmDelete(item)}>
          <Ionicons name="trash-outline" size={18} color="#E74C3C" />
          <Text style={styles.iconText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#3498DB" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No knowledgebase items yet.</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateEditKBItem')}>
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 88 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  titleWrap: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  meta: { fontSize: 12, color: '#3498DB', fontWeight: 'bold', marginTop: 3 },
  description: { color: '#7F8C8D', fontSize: 13, lineHeight: 19, marginTop: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  iconText: { color: '#2C3E50', fontSize: 12, fontWeight: '700' },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#3498DB',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  empty: { textAlign: 'center', color: '#7F8C8D', marginTop: 30 },
});

export default ManageKBArticlesScreen;

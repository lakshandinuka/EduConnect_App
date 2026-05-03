import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getAnnouncements } from '../services/announcementService';
import { useFocusEffect } from '@react-navigation/native';

const POLL_INTERVAL = 30000; // 30 seconds

const AnnouncementsScreen = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef(null);

  const fetchAnnouncements = async (silent = false) => {
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.log('Error fetching announcements', error);
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      fetchAnnouncements();
      // Start polling when screen is focused
      pollRef.current = setInterval(() => fetchAnnouncements(true), POLL_INTERVAL);
      return () => {
        // Stop polling when screen loses focus
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.content}>{item.content}</Text>
      <Text style={styles.footer}>
        Posted by {item.createdBy?.name || 'Admin'} • {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No announcements found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 12,
  },
  footer: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  emptyText: {
    textAlign: 'center',
    color: '#7F8C8D',
    marginTop: 20,
  },
});

export default AnnouncementsScreen;

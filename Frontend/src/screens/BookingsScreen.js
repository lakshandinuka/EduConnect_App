import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { getBookings } from '../services/bookingService';
import { Ionicons } from '@expo/vector-icons';

const BookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const data = await getBookings();
      setBookings(data);
    } catch (error) {
      console.log('Error fetching bookings', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBookings();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#F39C12';
      case 'APPROVED': return '#27AE60';
      case 'REJECTED': return '#E74C3C';
      case 'CANCELLED': return '#7F8C8D';
      default: return '#3498DB';
    }
  };

  const renderItem = ({ item }) => {
    const ts = item.timeSlot;
    const dateStr = ts ? new Date(ts.date).toLocaleDateString() : 'N/A';
    const timeStr = ts ? `${ts.startTime} - ${ts.endTime}` : 'N/A';

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Booking: {dateStr}</Text>
          <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.time}>Time: {timeStr}</Text>
        <Text style={styles.reason} numberOfLines={2}>Reason: {item.reason}</Text>
        <Text style={styles.date}>Requested on {new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
    );
  };

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
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No bookings found.</Text>}
      />
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CreateBooking')}
      >
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>
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
    paddingBottom: 80,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  time: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3498DB',
    marginBottom: 8,
  },
  reason: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 10,
  },
  date: {
    fontSize: 12,
    color: '#BDC3C7',
  },
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
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  emptyText: {
    textAlign: 'center',
    color: '#7F8C8D',
    marginTop: 20,
  },
});

export default BookingsScreen;

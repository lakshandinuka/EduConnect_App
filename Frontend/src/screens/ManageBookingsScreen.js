import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Platform
} from 'react-native';
import { getAllBookings, updateBookingStatus } from '../services/bookingService';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message || ''}`);
  } else {
    Alert.alert(title, message);
  }
};

const showConfirm = (title, message, onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: onConfirm },
    ]);
  }
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

const ManageBookingsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const data = await getAllBookings();
      setBookings(data);
    } catch (e) {
      showAlert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleStatus = async (id, status) => {
    showConfirm(
      'Confirm',
      `Are you sure you want to ${status.toLowerCase()} this booking?`,
      async () => {
        try {
          await updateBookingStatus(id, status);
          fetchBookings();
        } catch (e) {
          showAlert('Error', 'Could not update booking');
        }
      }
    );
  };

  const renderItem = ({ item }) => {
    const ts = item.timeSlot;
    const dateStr = ts ? new Date(ts.date).toLocaleDateString() : 'N/A';
    const timeStr = ts ? `${ts.startTime} – ${ts.endTime}` : 'N/A';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.studentName}>{item.student?.name}</Text>
            <Text style={styles.studentEmail}>{item.student?.email}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>📅 {dateStr}  ⏰ {timeStr}</Text>
        <Text style={styles.reasonText} numberOfLines={2}>Reason: {item.reason}</Text>

        {item.status === 'PENDING' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#27AE60' }]}
              onPress={() => handleStatus(item._id, 'APPROVED')}
            >
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#E74C3C' }]}
              onPress={() => handleStatus(item._id, 'REJECTED')}
            >
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#E67E22" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No bookings found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 5, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  studentName: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  studentEmail: { fontSize: 12, color: '#7F8C8D' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  dateText: { fontSize: 14, color: '#34495E', marginBottom: 6 },
  reasonText: { fontSize: 13, color: '#7F8C8D', marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  empty: { textAlign: 'center', color: '#7F8C8D', marginTop: 30 },
});

export default ManageBookingsScreen;

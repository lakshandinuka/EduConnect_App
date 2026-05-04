import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { getBookings, updateBooking, cancelBooking } from '../services/bookingService';
import { Ionicons } from '@expo/vector-icons';

const POLL_INTERVAL = 30000;

// Cross-platform alert: uses window.alert on web, Alert on native
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message || ''}`);
  } else {
    Alert.alert(title, message);
  }
};

// Cross-platform confirm: returns true/false on web, calls onConfirm callback on native
const showConfirm = (title, message, onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

const BookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const pollRef = useRef(null);

  const fetchBookings = async (silent = false) => {
    try {
      const data = await getBookings();
      setBookings(data);
    } catch (error) {
      console.log('Error fetching bookings', error);
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    // Fetch immediately on mount (needed for Expo Web where focus events may not fire)
    fetchBookings();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      fetchBookings();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => fetchBookings(true), POLL_INTERVAL);
    });
    const unsubscribeBlur = navigation.addListener('blur', () => {
      if (pollRef.current) clearInterval(pollRef.current);
    });
    return () => {
      unsubscribe();
      unsubscribeBlur();
      if (pollRef.current) clearInterval(pollRef.current);
    };
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

  // ---- Edit handlers ----
  const openEditModal = (booking) => {
    setEditingBooking(booking);
    setEditReason(booking.reason || '');
    setEditError('');
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editReason.trim()) {
      setEditError('Reason cannot be empty.');
      return;
    }
    setEditError('');
    setSaving(true);
    try {
      await updateBooking(editingBooking._id, editReason.trim());
      setEditModalVisible(false);
      await fetchBookings(true);
      showAlert('Updated', 'Your booking reason has been updated.');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update booking. Please try again.';
      setEditError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ---- Cancel handler ----
  const handleCancel = (bookingId) => {
    showConfirm(
      'Cancel Booking',
      'Are you sure you want to cancel this appointment?',
      async () => {
        try {
          await cancelBooking(bookingId);
          await fetchBookings(true);
          showAlert('Cancelled', 'Your booking has been cancelled.');
        } catch (error) {
          const msg = error.response?.data?.message || 'Failed to cancel booking.';
          showAlert('Error', msg);
        }
      }
    );
  };

  const renderItem = ({ item }) => {
    const ts = item.timeSlot;
    const dateStr = ts ? new Date(ts.date).toLocaleDateString() : 'N/A';
    const timeStr = ts ? `${ts.startTime} - ${ts.endTime}` : 'N/A';
    const isPending = item.status === 'PENDING';

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Booking: {dateStr}</Text>
          <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.time}>Time: {timeStr}</Text>
        <Text style={styles.reason} numberOfLines={3}>Reason: {item.reason}</Text>
        <Text style={styles.date}>Requested on {new Date(item.createdAt).toLocaleDateString()}</Text>

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="pencil-outline" size={15} color="#FFF" />
              <Text style={styles.actionBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => handleCancel(item._id)}
            >
              <Ionicons name="close-circle-outline" size={15} color="#FFF" />
              <Text style={styles.actionBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
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
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={48} color="#BDC3C7" />
            <Text style={styles.emptyText}>No appointments found.</Text>
            <Text style={styles.emptySubText}>Tap + to book your first appointment.</Text>
          </View>
        }
      />

      {/* FAB - New Booking */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateBooking')}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Edit Reason Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Appointment Reason</Text>
            <Text style={styles.modalSubTitle}>
              You can only edit the reason for a pending booking.
            </Text>

            <TextInput
              style={[styles.input, styles.textArea, editError ? styles.inputError : null]}
              value={editReason}
              onChangeText={(text) => {
                setEditReason(text);
                if (editError) setEditError('');
              }}
              placeholder="Enter your reason..."
              multiline
              textAlignVertical="top"
              autoFocus
            />

            {/* Inline error message */}
            {editError ? (
              <Text style={styles.errorText}>{editError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={closeEditModal}
                disabled={saving}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.saveBtnText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
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
    paddingHorizontal: 10,
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
    fontWeight: '600',
    color: '#3498DB',
    marginBottom: 6,
  },
  reason: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 8,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    color: '#BDC3C7',
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  editBtn: {
    backgroundColor: '#3498DB',
  },
  cancelBtn: {
    backgroundColor: '#E74C3C',
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#27AE60',
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 13,
    color: '#BDC3C7',
    marginTop: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 6,
  },
  modalSubTitle: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#DDE3EC',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 6,
  },
  inputError: {
    borderColor: '#E74C3C',
  },
  textArea: {
    height: 110,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 13,
    marginBottom: 14,
    marginLeft: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelModalBtn: {
    backgroundColor: '#F0F3F8',
  },
  cancelModalBtnText: {
    color: '#7F8C8D',
    fontWeight: 'bold',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#3498DB',
  },
  saveBtnDisabled: {
    backgroundColor: '#85C1E9',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default BookingsScreen;

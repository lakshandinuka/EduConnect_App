import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, Platform,
} from 'react-native';
import { getAllTimeSlots, createTimeSlot } from '../services/bookingService';
import { Ionicons } from '@expo/vector-icons';

// ─── Cross-platform date/time picker helpers ────────────────────────────────
// On web: renders native <input type="date"> / <input type="time">
// On native: falls back to @react-native-community/datetimepicker if installed

const WebDateInput = ({ value, onChange, label }) => {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={webStyles.wrapper}>
      <Text style={webStyles.label}>{label}</Text>
      <input
        type="date"
        value={value}
        min={new Date().toISOString().split('T')[0]}
        onChange={(e) => onChange(e.target.value)}
        style={webStyles.input}
      />
    </View>
  );
};

const WebTimeInput = ({ value, onChange, label }) => {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={webStyles.wrapper}>
      <Text style={webStyles.label}>{label}</Text>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={webStyles.input}
      />
    </View>
  );
};

const webStyles = {
  wrapper: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: '#7F8C8D', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '15px',
    borderRadius: '10px',
    border: '1.5px solid #E0E6ED',
    backgroundColor: '#F8FAFC',
    color: '#2C3E50',
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatDisplayDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDisplayTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

// ─── Main Screen ────────────────────────────────────────────────────────────
const ManageTimeSlotsScreen = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [submitting, setSubmitting] = useState(false);

  const fetchSlots = async () => {
    try {
      const data = await getAllTimeSlots();
      setSlots(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load time slots');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSlots(); }, []);

  const openModal = () => {
    // Reset to sensible defaults each time
    setDate(today);
    setStartTime('09:00');
    setEndTime('10:00');
    setModalVisible(true);
  };

  const handleCreate = async () => {
    if (!date || !startTime || !endTime) {
      Alert.alert('Error', 'Please select a date, start time, and end time.');
      return;
    }
    // Basic time ordering check
    if (startTime >= endTime) {
      Alert.alert('Invalid Times', 'End time must be after start time.');
      return;
    }
    setSubmitting(true);
    try {
      await createTimeSlot({ date, startTime, endTime });
      setModalVisible(false);
      fetchSlots();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create time slot');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.dateBlock}>
          <Ionicons name="calendar-outline" size={18} color="#9B59B6" />
          <Text style={styles.cardDate}>{formatDisplayDate(item.date?.split('T')[0])}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: item.isAvailable ? '#27AE60' : '#E74C3C' }]}>
          <Text style={styles.badgeText}>{item.isAvailable ? 'AVAILABLE' : 'BOOKED'}</Text>
        </View>
      </View>
      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={16} color="#9B59B6" />
        <Text style={styles.timeText}>
          {formatDisplayTime(item.startTime)} – {formatDisplayTime(item.endTime)}
        </Text>
      </View>
      {item.assignedStaff && (
        <Text style={styles.staffText}>
          <Ionicons name="person-outline" size={12} /> Staff: {item.assignedStaff.name}
        </Text>
      )}
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#9B59B6" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={slots}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSlots(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No time slots found. Tap + to add one.</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={26} color="#FFF" />
      </TouchableOpacity>

      {/* ── Add Time Slot Modal ────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBadge}>
                <Ionicons name="calendar" size={22} color="#9B59B6" />
              </View>
              <Text style={styles.modalTitle}>Add Time Slot</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#7F8C8D" />
              </TouchableOpacity>
            </View>

            {/* Date Picker */}
            <WebDateInput
              label="📅  Date"
              value={date}
              onChange={setDate}
            />

            {/* Selected date preview */}
            {date ? (
              <View style={styles.previewRow}>
                <Ionicons name="calendar-outline" size={14} color="#9B59B6" />
                <Text style={styles.previewText}>{formatDisplayDate(date)}</Text>
              </View>
            ) : null}

            {/* Time row */}
            <View style={styles.timeInputRow}>
              <View style={{ flex: 1 }}>
                <WebTimeInput
                  label="⏰  Start Time"
                  value={startTime}
                  onChange={setStartTime}
                />
              </View>
              <View style={styles.timeSeparator}>
                <Text style={styles.timeSeparatorText}>→</Text>
              </View>
              <View style={{ flex: 1 }}>
                <WebTimeInput
                  label="⏰  End Time"
                  value={endTime}
                  onChange={setEndTime}
                />
              </View>
            </View>

            {/* Duration preview */}
            {startTime && endTime && startTime < endTime ? (
              <View style={styles.durationRow}>
                <Ionicons name="hourglass-outline" size={14} color="#27AE60" />
                <Text style={styles.durationText}>
                  {formatDisplayTime(startTime)} → {formatDisplayTime(endTime)}
                  {'  '}·{'  '}
                  {(() => {
                    const [sh, sm] = startTime.split(':').map(Number);
                    const [eh, em] = endTime.split(':').map(Number);
                    const mins = (eh * 60 + em) - (sh * 60 + sm);
                    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}` : `${mins}m`;
                  })()}
                </Text>
              </View>
            ) : startTime >= endTime && endTime ? (
              <View style={[styles.durationRow, { backgroundColor: '#FDEDEC' }]}>
                <Ionicons name="warning-outline" size={14} color="#E74C3C" />
                <Text style={[styles.durationText, { color: '#E74C3C' }]}>
                  End time must be after start time
                </Text>
              </View>
            ) : null}

            {/* Buttons */}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, (submitting || startTime >= endTime) && styles.btnDisabled]}
                onPress={handleCreate}
                disabled={submitting || startTime >= endTime}
              >
                {submitting
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                      <Text style={styles.createText}>Create Slot</Text>
                    </View>
                  )
                }
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 90 },

  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between' },
  dateBlock: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  cardDate: { fontSize: 15, fontWeight: '700', color: '#2C3E50' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 15, color: '#9B59B6', fontWeight: '600' },
  staffText: { fontSize: 12, color: '#7F8C8D', marginTop: 6 },

  fab: {
    position: 'absolute', bottom: 20, right: 20, backgroundColor: '#9B59B6',
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center',
    alignItems: 'center', elevation: 6,
    shadowColor: '#9B59B6', shadowOpacity: 0.4, shadowRadius: 8,
  },
  empty: { textAlign: 'center', color: '#BDC3C7', marginTop: 40, fontSize: 14 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#FFF', borderRadius: 20, padding: 22 },

  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalIconBadge: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3E8FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#2C3E50' },
  closeBtn: { padding: 4 },

  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3E8FF', borderRadius: 8, paddingVertical: 7,
    paddingHorizontal: 12, marginBottom: 14,
  },
  previewText: { fontSize: 13, color: '#8E44AD', fontWeight: '600' },

  timeInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  timeSeparator: { paddingBottom: 12, alignItems: 'center' },
  timeSeparatorText: { fontSize: 18, color: '#BDC3C7', fontWeight: 'bold' },

  durationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EAFAF1', borderRadius: 8, paddingVertical: 7,
    paddingHorizontal: 12, marginBottom: 18,
  },
  durationText: { fontSize: 12, color: '#27AE60', fontWeight: '600' },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, backgroundColor: '#ECF0F1', borderRadius: 10, padding: 13, alignItems: 'center' },
  cancelText: { color: '#7F8C8D', fontWeight: '700' },
  createBtn: { flex: 1, backgroundColor: '#9B59B6', borderRadius: 10, padding: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnDisabled: { opacity: 0.45 },
  createText: { color: '#FFF', fontWeight: '700' },
});

export default ManageTimeSlotsScreen;

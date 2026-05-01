import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { getAvailableTimeSlots, createBooking } from '../services/bookingService';

const CreateBookingScreen = ({ navigation }) => {
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  const fetchTimeSlots = async () => {
    try {
      const data = await getAvailableTimeSlots();
      setTimeSlots(data);
    } catch (error) {
      console.log('Error fetching timeslots', error);
      Alert.alert('Error', 'Could not load time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSlotId || !reason) {
      Alert.alert('Error', 'Please select a time slot and provide a reason');
      return;
    }

    setSubmitting(true);
    try {
      await createBooking({ timeSlotId: selectedSlotId, reason });
      Alert.alert('Success', 'Booking requested successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Select Available Time Slot</Text>
      
      {timeSlots.length === 0 ? (
        <Text style={styles.emptyText}>No available time slots at the moment.</Text>
      ) : (
        <View style={styles.slotsContainer}>
          {timeSlots.map((slot) => {
            const dateStr = new Date(slot.date).toLocaleDateString();
            const isSelected = selectedSlotId === slot._id;
            return (
              <TouchableOpacity
                key={slot._id}
                style={[styles.slotCard, isSelected && styles.slotCardSelected]}
                onPress={() => setSelectedSlotId(slot._id)}
              >
                <Text style={[styles.slotDate, isSelected && styles.slotTextSelected]}>
                  {dateStr}
                </Text>
                <Text style={[styles.slotTime, isSelected && styles.slotTextSelected]}>
                  {slot.startTime} - {slot.endTime}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={styles.label}>Reason for Appointment</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Briefly describe why you need this appointment..."
        value={reason}
        onChangeText={setReason}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleSubmit} 
        disabled={submitting || timeSlots.length === 0}
      >
        {submitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Submit Request</Text>
        )}
      </TouchableOpacity>
      
      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F7FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
    marginTop: 10,
  },
  emptyText: {
    color: '#7F8C8D',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  slotCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E6ED',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  slotCardSelected: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  slotDate: {
    fontSize: 14,
    color: '#34495E',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  slotTime: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  slotTextSelected: {
    color: '#FFF',
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E6ED',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
  },
  button: {
    backgroundColor: '#27AE60',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateBookingScreen;

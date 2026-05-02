import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createTicket } from '../services/ticketService';
import { getDepartments } from '../services/departmentService';
import { getInquiryTypes } from '../services/inquiryTypeService';

const CreateTicketScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [inquiryType, setInquiryType] = useState('');
  
  const [departments, setDepartments] = useState([]);
  const [inquiryTypes, setInquiryTypes] = useState([]);
  const [loadingForm, setLoadingForm] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const [deptData, inqData] = await Promise.all([
        getDepartments(),
        getInquiryTypes()
      ]);
      setDepartments(deptData);
      setInquiryTypes(inqData);
      
      // Auto select first items if available
      if (deptData.length > 0) setDepartment(deptData[0]._id);
      if (inqData.length > 0) setInquiryType(inqData[0]._id);
    } catch (error) {
      console.log('Error fetching form data', error);
      Alert.alert('Error', 'Could not load form data');
    } finally {
      setLoadingForm(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !department || !inquiryType) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await createTicket({ title, description, department, inquiryType });
      Alert.alert('Success', 'Ticket created successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingForm) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Brief subject of your issue"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Department</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={department}
          onValueChange={(itemValue) => setDepartment(itemValue)}
        >
          {departments.map((dept) => (
            <Picker.Item key={dept._id} label={dept.name} value={dept._id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Inquiry Type</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={inquiryType}
          onValueChange={(itemValue) => setInquiryType(itemValue)}
        >
          {inquiryTypes.map((inq) => (
            <Picker.Item key={inq._id} label={inq.name} value={inq._id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Provide detailed information..."
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Submit Ticket</Text>
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
    marginBottom: 8,
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
  pickerContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E6ED',
    borderRadius: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  textArea: {
    height: 120,
  },
  button: {
    backgroundColor: '#3498DB',
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

export default CreateTicketScreen;

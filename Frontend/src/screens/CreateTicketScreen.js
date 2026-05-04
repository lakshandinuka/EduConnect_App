import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createTicket } from '../services/ticketService';
import { getDepartments } from '../services/departmentService';
import { getInquiryTypes } from '../services/inquiryTypeService';

// Replaced @react-native-picker/picker with custom chip selectors —
// Picker.onValueChange is unreliable on Expo Web and can silently fail,
// leaving department/inquiryType as '' and blocking the validation check.

const CreateTicketScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState(null);   // stores full object { _id, name }
  const [inquiryType, setInquiryType] = useState(null); // stores full object { _id, name }

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
        getInquiryTypes(),
      ]);
      setDepartments(deptData);
      setInquiryTypes(inqData);
      // Auto-select first items if available
      if (deptData.length > 0) setDepartment(deptData[0]);
      if (inqData.length > 0) setInquiryType(inqData[0]);
    } catch (error) {
      console.log('Error fetching form data:', error);
      Alert.alert('Error', 'Could not load departments/inquiry types. Please try again.');
    } finally {
      setLoadingForm(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter a title for your ticket.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Field', 'Please enter a description.');
      return;
    }
    if (!department) {
      Alert.alert('Missing Field', 'Please select a department.');
      return;
    }
    if (!inquiryType) {
      Alert.alert('Missing Field', 'Please select an inquiry type.');
      return;
    }

    setSubmitting(true);
    try {
      await createTicket({
        title: title.trim(),
        description: description.trim(),
        department: department._id,
        inquiryType: inquiryType._id,
      });
      Alert.alert(
        'Ticket Submitted',
        'Your ticket has been created successfully.',
        [{ text: 'Done', onPress: () => navigation.goBack() }],
        { cancelable: false }
      );
    } catch (error) {
      console.log('Ticket create error:', error.response?.data || error.message);
      Alert.alert(
        'Submission Failed',
        error.response?.data?.message || 'Failed to create ticket. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingForm) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.label}>
            Title <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="document-text-outline" size={18} color="#7F8C8D" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Brief subject of your issue"
              placeholderTextColor="#BDC3C7"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Department */}
          <Text style={styles.label}>
            Department <Text style={styles.required}>*</Text>
          </Text>
          {departments.length === 0 ? (
            <View style={styles.emptyNotice}>
              <Ionicons name="alert-circle-outline" size={16} color="#E67E22" />
              <Text style={styles.emptyNoticeText}>
                No departments found. Ask an admin to add departments first.
              </Text>
            </View>
          ) : (
            <View style={styles.chipGrid}>
              {departments.map((dept) => (
                <TouchableOpacity
                  key={dept._id}
                  style={[
                    styles.chip,
                    department?._id === dept._id && styles.chipSelected,
                  ]}
                  onPress={() => setDepartment(dept)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="business-outline"
                    size={14}
                    color={department?._id === dept._id ? '#fff' : '#3498DB'}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      department?._id === dept._id && styles.chipTextSelected,
                    ]}
                  >
                    {dept.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Inquiry Type */}
          <Text style={styles.label}>
            Inquiry Type <Text style={styles.required}>*</Text>
          </Text>
          {inquiryTypes.length === 0 ? (
            <View style={styles.emptyNotice}>
              <Ionicons name="alert-circle-outline" size={16} color="#E67E22" />
              <Text style={styles.emptyNoticeText}>
                No inquiry types found. Ask an admin to add inquiry types first.
              </Text>
            </View>
          ) : (
            <View style={styles.chipGrid}>
              {inquiryTypes.map((inq) => (
                <TouchableOpacity
                  key={inq._id}
                  style={[
                    styles.chip,
                    inquiryType?._id === inq._id && styles.chipSelected,
                  ]}
                  onPress={() => setInquiryType(inq)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={14}
                    color={inquiryType?._id === inq._id ? '#fff' : '#3498DB'}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      inquiryType?._id === inq._id && styles.chipTextSelected,
                    ]}
                  >
                    {inq.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Description */}
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.inputBare, styles.textArea]}
            placeholder="Provide detailed information about your issue..."
            placeholderTextColor="#BDC3C7"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          {/* Summary preview strip */}
          {(department || inquiryType) && (
            <View style={styles.summaryStrip}>
              <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
              <Text style={styles.summaryText}>
                {department?.name ?? '—'} · {inquiryType?.name ?? '—'}
              </Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Submit Ticket</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  contentContainer: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#7F8C8D',
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: '#E74C3C',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E6ED',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: '#2C3E50',
  },
  inputBare: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E6ED',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#2C3E50',
    marginBottom: 16,
  },
  textArea: {
    height: 130,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF4FD',
    borderWidth: 1.5,
    borderColor: '#3498DB',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  chipSelected: {
    backgroundColor: '#3498DB',
    borderColor: '#2980B9',
  },
  chipText: {
    fontSize: 13,
    color: '#3498DB',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  emptyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9E7',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0E68C',
  },
  emptyNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#E67E22',
    lineHeight: 18,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAFAF1',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 13,
    color: '#27AE60',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#3498DB',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default CreateTicketScreen;

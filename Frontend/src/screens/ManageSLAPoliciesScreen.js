import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput, ScrollView
} from 'react-native';

import {
  getSLAPolicies,
  createSLAPolicy,
  updateSLAPolicy,
  deleteSLAPolicy,
} from '../services/slaPolicyService';

import { Ionicons } from '@expo/vector-icons';

const ManageSLAPoliciesScreen = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  const [responseTimeValue, setResponseTimeValue] = useState('');
  const [responseTimeUnit, setResponseTimeUnit] = useState('HOURS');

  const [resolutionTimeValue, setResolutionTimeValue] = useState('');
  const [resolutionTimeUnit, setResolutionTimeUnit] = useState('HOURS');

  const [submitting, setSubmitting] = useState(false);

  const fetchPolicies = async () => {
    try {
      const data = await getSLAPolicies();
      setPolicies(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load SLA policies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const resetForm = () => {
    setName('');
    setDepartment('');
    setPriority('');
    setStatus('ACTIVE');
    setResponseTimeValue('');
    setResponseTimeUnit('HOURS');
    setResolutionTimeValue('');
    setResolutionTimeUnit('HOURS');
    setSelectedPolicy(null);
    setIsEditing(false);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (policy) => {
    setSelectedPolicy(policy);
    setIsEditing(true);

    setName(policy.name || '');
    setDepartment(policy.department || '');
    setPriority(policy.priority || '');
    setStatus(policy.status || 'ACTIVE');

    setResponseTimeValue(
      policy.responseTimeValue !== undefined && policy.responseTimeValue !== null
        ? String(policy.responseTimeValue)
        : ''
    );

    setResponseTimeUnit(policy.responseTimeUnit || 'HOURS');

    setResolutionTimeValue(
      policy.resolutionTimeValue !== undefined && policy.resolutionTimeValue !== null
        ? String(policy.resolutionTimeValue)
        : ''
    );

    setResolutionTimeUnit(policy.resolutionTimeUnit || 'HOURS');

    setModalVisible(true);
  };

  const openViewModal = (policy) => {
    setSelectedPolicy(policy);
    setViewModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !responseTimeValue || !resolutionTimeValue) {
      Alert.alert('Error', 'Name, Response Time, and Resolution Time are required');
      return;
    }

    setSubmitting(true);

    const policyData = {
      name,
      department,
      priority: priority || undefined,
      status,
      responseTimeValue: parseInt(responseTimeValue),
      responseTimeUnit,
      resolutionTimeValue: parseInt(resolutionTimeValue),
      resolutionTimeUnit,
      escalationRules: selectedPolicy?.escalationRules || [],
    };

    try {
      if (isEditing && selectedPolicy) {
        await updateSLAPolicy(selectedPolicy._id, policyData);
        Alert.alert('Success', 'SLA policy updated successfully');
      } else {
        await createSLAPolicy(policyData);
        Alert.alert('Success', 'SLA policy created successfully');
      }

      resetForm();
      setModalVisible(false);
      fetchPolicies();
    } catch (e) {
      Alert.alert(
        'Error',
        isEditing ? 'Failed to update SLA policy' : 'Failed to create SLA policy'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (policy) => {
    Alert.alert(
      'Delete SLA Policy',
      `Are you sure you want to delete "${policy.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSLAPolicy(policy._id);
              Alert.alert('Success', 'SLA policy deleted successfully');
              fetchPolicies();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete SLA policy');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="shield-checkmark-outline" size={22} color="#C0392B" />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.name}>{item.name}</Text>

        <Text style={styles.desc}>
          Department: {item.department || 'N/A'}
        </Text>

        <Text style={styles.desc}>
          Priority: {item.priority || 'N/A'} | Status: {item.status || 'N/A'}
        </Text>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            Response: {item.responseTimeValue || 0} {item.responseTimeUnit || 'HOURS'}
          </Text>

          <Text style={styles.timeText}>
            Resolution: {item.resolutionTimeValue || 0} {item.resolutionTimeUnit || 'HOURS'}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.viewBtn} onPress={() => openViewModal(item)}>
            <Ionicons name="eye-outline" size={16} color="#FFF" />
            <Text style={styles.actionText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Ionicons name="create-outline" size={16} color="#FFF" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={16} color="#FFF" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C0392B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={policies}
        keyExtractor={(i) => i._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPolicies();
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No SLA policies found.</Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit SLA Policy' : 'Add SLA Policy'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Policy Name *"
                value={name}
                onChangeText={setName}
              />

              <TextInput
                style={styles.input}
                placeholder="Department"
                value={department}
                onChangeText={setDepartment}
              />

              <TextInput
                style={styles.input}
                placeholder="Priority: LOW / MEDIUM / HIGH / CRITICAL"
                value={priority}
                onChangeText={(text) => setPriority(text.toUpperCase())}
              />

              <TextInput
                style={styles.input}
                placeholder="Status: ACTIVE / INACTIVE"
                value={status}
                onChangeText={(text) => setStatus(text.toUpperCase())}
              />

              <TextInput
                style={styles.input}
                placeholder="Response Time Value *"
                value={responseTimeValue}
                onChangeText={setResponseTimeValue}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Response Time Unit: HOURS / MINUTES / DAYS"
                value={responseTimeUnit}
                onChangeText={(text) => setResponseTimeUnit(text.toUpperCase())}
              />

              <TextInput
                style={styles.input}
                placeholder="Resolution Time Value *"
                value={resolutionTimeValue}
                onChangeText={setResolutionTimeValue}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Resolution Time Unit: HOURS / MINUTES / DAYS"
                value={resolutionTimeUnit}
                onChangeText={(text) => setResolutionTimeUnit(text.toUpperCase())}
              />

              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    resetForm();
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.createText}>
                      {isEditing ? 'Update' : 'Add'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={viewModalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView>
              <Text style={styles.modalTitle}>SLA Policy Details</Text>

              {selectedPolicy && (
                <>
                  <Text style={styles.detailLabel}>Policy Name</Text>
                  <Text style={styles.detailValue}>{selectedPolicy.name}</Text>

                  <Text style={styles.detailLabel}>Department</Text>
                  <Text style={styles.detailValue}>{selectedPolicy.department || 'N/A'}</Text>

                  <Text style={styles.detailLabel}>Priority</Text>
                  <Text style={styles.detailValue}>{selectedPolicy.priority || 'N/A'}</Text>

                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{selectedPolicy.status || 'N/A'}</Text>

                  <Text style={styles.detailLabel}>Response Time</Text>
                  <Text style={styles.detailValue}>
                    {selectedPolicy.responseTimeValue || 0} {selectedPolicy.responseTimeUnit || 'HOURS'}
                  </Text>

                  <Text style={styles.detailLabel}>Resolution Time</Text>
                  <Text style={styles.detailValue}>
                    {selectedPolicy.resolutionTimeValue || 0} {selectedPolicy.resolutionTimeUnit || 'HOURS'}
                  </Text>

                  <Text style={styles.detailLabel}>Escalation Rules</Text>
                  <Text style={styles.detailValue}>
                    {selectedPolicy.escalationRules?.length || 0} rule(s)
                  </Text>
                </>
              )}

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setViewModalVisible(false)}
              >
                <Text style={styles.createText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  iconWrap: {
    backgroundColor: '#FDEDEC',
    borderRadius: 10,
    padding: 10,
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  desc: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  timeRow: { flexDirection: 'row', marginTop: 8, gap: 15, flexWrap: 'wrap' },
  timeText: { fontSize: 12, color: '#C0392B', fontWeight: 'bold' },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  viewBtn: {
    backgroundColor: '#2980B9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtn: {
    backgroundColor: '#F39C12',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteBtn: {
    backgroundColor: '#C0392B',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#C0392B',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  empty: { textAlign: 'center', color: '#7F8C8D', marginTop: 30 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#ECF0F1',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
  },
  cancelText: { color: '#7F8C8D', fontWeight: 'bold' },
  createBtn: {
    flex: 1,
    backgroundColor: '#C0392B',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
  },
  createText: { color: '#FFF', fontWeight: 'bold' },
  closeBtn: {
    backgroundColor: '#C0392B',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  detailLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    fontWeight: 'bold',
    marginTop: 10,
  },
  detailValue: {
    fontSize: 15,
    color: '#2C3E50',
    marginTop: 3,
  },
});

export default ManageSLAPoliciesScreen;
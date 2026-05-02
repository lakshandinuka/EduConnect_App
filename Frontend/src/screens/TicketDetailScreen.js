import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, FlatList, Alert, ScrollView, Modal 
} from 'react-native';
import { 
  getTicketById, addTicketComment, escalateTicket, 
  approveTicket, updateTicketSLA 
} from '../services/ticketService';
import { getSLAPolicies } from '../services/slaPolicyService';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const TicketDetailScreen = ({ route, navigation }) => {
  const { ticketId } = route.params;
  const { userInfo } = useContext(AuthContext);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Modals
  const [escalateModal, setEscalateModal] = useState(false);
  const [approveModal, setApproveModal] = useState(false);
  const [slaModal, setSlaModal] = useState(false);
  const [policies, setPolicies] = useState([]);
  
  const [note, setNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('RESOLVED');

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const data = await getTicketById(ticketId);
      setTicket(data);
    } catch (error) {
      Alert.alert('Error', 'Could not load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const newComments = await addTicketComment(ticketId, commentText);
      setTicket(prev => ({ ...prev, comments: newComments }));
      setCommentText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async () => {
    setSubmitting(true);
    try {
      const updated = await escalateTicket(ticketId, note);
      setTicket(updated);
      setEscalateModal(false);
      setNote('');
      Alert.alert('Success', 'Ticket escalated to admin');
    } catch (error) {
      Alert.alert('Error', 'Failed to escalate ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const updated = await approveTicket(ticketId, selectedStatus, note);
      setTicket(updated);
      setApproveModal(false);
      setNote('');
      Alert.alert('Success', `Ticket marked as ${selectedStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const openSlaModal = async () => {
    setLoading(true);
    try {
      const data = await getSLAPolicies();
      setPolicies(data);
      setSlaModal(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to load SLA policies');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachSLA = async (policyId) => {
    try {
      const updated = await updateTicketSLA(ticketId, policyId);
      setTicket(prev => ({ ...prev, slaPolicy: updated.slaPolicy }));
      setSlaModal(false);
      Alert.alert('Success', 'SLA Policy attached');
    } catch (e) {
      Alert.alert('Error', 'Failed to attach SLA');
    }
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentCard}>
      <Text style={styles.commentAuthor}>{item.author?.name} ({item.author?.role})</Text>
      <Text style={styles.commentText}>{item.text}</Text>
      <Text style={styles.commentDate}>{new Date(item.createdAt).toLocaleString()}</Text>
    </View>
  );

  if (loading || !ticket) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  const isStaff = userInfo?.role === 'staff';
  const isAdmin = userInfo?.role === 'admin';

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <View>
            <View style={styles.headerCard}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{ticket.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: ticket.status === 'ESCALATED' ? '#E74C3C' : '#3498DB' }]}>
                  <Text style={styles.statusText}>{ticket.status}</Text>
                </View>
              </View>
              <Text style={styles.deptText}>{ticket.department?.name} • {ticket.inquiryType?.name}</Text>
              <Text style={styles.desc}>{ticket.description}</Text>
              
              {ticket.slaPolicy && (
                <View style={styles.slaInfo}>
                  <Ionicons name="shield-checkmark" size={16} color="#C0392B" />
                  <Text style={styles.slaText}>SLA: {ticket.slaPolicy.name}</Text>
                </View>
              )}

              <Text style={styles.date}>Created by {ticket.student?.name} on {new Date(ticket.createdAt).toLocaleString()}</Text>
            </View>

            {/* Action Buttons for Staff/Admin */}
            <View style={styles.actionContainer}>
              {isStaff && ticket.status !== 'ESCALATED' && (
                <TouchableOpacity style={styles.escalateBtn} onPress={() => setEscalateModal(true)}>
                  <Ionicons name="arrow-up-circle" size={20} color="#FFF" />
                  <Text style={styles.btnText}>Escalate to Admin</Text>
                </TouchableOpacity>
              )}
              
              {isAdmin && (
                <View style={styles.adminActions}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => setApproveModal(true)}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.btnText}>Action Ticket</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.slaBtn} onPress={openSlaModal}>
                    <Ionicons name="shield" size={20} color="#FFF" />
                    <Text style={styles.btnText}>Attach SLA</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>Comments</Text>
          </View>
        }
        data={ticket.comments}
        keyExtractor={(item) => item._id}
        renderItem={renderComment}
        contentContainerStyle={styles.commentsList}
        ListEmptyComponent={<Text style={styles.emptyText}>No comments yet.</Text>}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={handleAddComment}
          disabled={submitting || !commentText.trim()}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Ionicons name="send" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Escalate Modal */}
      <Modal visible={escalateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Escalate Ticket</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for escalation..."
              value={note}
              onChangeText={setNote}
              multiline
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEscalateModal(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleEscalate}>
                <Text style={{color: '#FFF'}}>Escalate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Approve Modal */}
      <Modal visible={approveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Ticket Status</Text>
            <View style={styles.statusRow}>
              {['RESOLVED', 'CLOSED', 'IN_PROGRESS'].map(s => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.statusBtn, selectedStatus === s && styles.statusBtnActive]}
                  onPress={() => setSelectedStatus(s)}
                >
                  <Text style={[styles.statusBtnText, selectedStatus === s && styles.statusBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Admin note..."
              value={note}
              onChangeText={setNote}
              multiline
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setApproveModal(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleApprove}>
                <Text style={{color: '#FFF'}}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SLA Modal */}
      <Modal visible={slaModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select SLA Policy</Text>
            <ScrollView style={{maxHeight: 300}}>
              {policies.map(p => (
                <TouchableOpacity key={p._id} style={styles.policyItem} onPress={() => handleAttachSLA(p._id)}>
                  <Text style={styles.policyName}>{p.name}</Text>
                  <Text style={styles.policyTimes}>{p.responseTime}h / {p.resolutionTime}h</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setSlaModal(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { backgroundColor: '#FFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E6ED' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  deptText: { fontSize: 14, fontWeight: 'bold', color: '#3498DB', marginBottom: 8 },
  desc: { fontSize: 15, color: '#34495E', marginBottom: 12, lineHeight: 22 },
  slaInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDEDEC', padding: 6, borderRadius: 6, marginBottom: 10 },
  slaText: { color: '#C0392B', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  date: { fontSize: 12, color: '#7F8C8D' },
  actionContainer: { padding: 16, flexDirection: 'row' },
  escalateBtn: { backgroundColor: '#E67E22', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, flex: 1, justifyContent: 'center' },
  adminActions: { flex: 1, gap: 10 },
  approveBtn: { backgroundColor: '#27AE60', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, justifyContent: 'center' },
  slaBtn: { backgroundColor: '#C0392B', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, justifyContent: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginHorizontal: 16, marginTop: 10, marginBottom: 10 },
  commentsList: { paddingHorizontal: 16, paddingBottom: 20 },
  commentCard: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#3498DB' },
  commentAuthor: { fontSize: 13, fontWeight: 'bold', color: '#2C3E50', marginBottom: 4 },
  commentText: { fontSize: 14, color: '#34495E', marginBottom: 6 },
  commentDate: { fontSize: 10, color: '#BDC3C7', textAlign: 'right' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E0E6ED', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F5F7FA', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100 },
  sendButton: { backgroundColor: '#3498DB', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalInput: { backgroundColor: '#F5F7FA', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top', marginBottom: 15 },
  modalRow: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#ECF0F1', borderRadius: 8 },
  modalSubmit: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#E67E22', borderRadius: 8 },
  statusRow: { flexDirection: 'row', gap: 5, marginBottom: 15 },
  statusBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#3498DB', borderRadius: 8 },
  statusBtnActive: { backgroundColor: '#3498DB' },
  statusBtnText: { fontSize: 11, color: '#3498DB', fontWeight: 'bold' },
  statusBtnTextActive: { color: '#FFF' },
  policyItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F5F7FA' },
  policyName: { fontWeight: 'bold', color: '#2C3E50' },
  policyTimes: { fontSize: 12, color: '#7F8C8D' }
});

export default TicketDetailScreen;

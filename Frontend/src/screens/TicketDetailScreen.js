import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, FlatList, Alert, ScrollView, Modal, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import {
  getTicketById, addTicketComment, escalateTicket,
  approveTicket, updateTicketSLA, rateTicket,
} from '../services/ticketService';
import { getSLAPolicies } from '../services/slaPolicyService';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// ─── Star Rating Component ──────────────────────────────────────────────────
const StarRating = ({ value, onChange, disabled = false, size = 32 }) => {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => !disabled && onChange && onChange(star)}
          activeOpacity={disabled ? 1 : 0.7}
          style={starStyles.starBtn}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? '#F39C12' : '#BDC3C7'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', marginVertical: 8 },
  starBtn: { paddingHorizontal: 4 },
});

// ─── Main Screen ────────────────────────────────────────────────────────────
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
  const [ratingModal, setRatingModal] = useState(false);
  const [policies, setPolicies] = useState([]);

  const [note, setNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('RESOLVED');

  // Rating state
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

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
    if (!note.trim()) {
      Alert.alert('Comment Required', 'Please provide a reason for escalating this ticket.');
      return;
    }
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

  const handleSubmitRating = async () => {
    if (selectedRating === 0) {
      Alert.alert('Please select', 'Choose at least 1 star before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await rateTicket(ticketId, selectedRating, ratingComment);
      setTicket(prev => ({ ...prev, rating: selectedRating, ratingComment }));
      setRatingModal(false);
      Alert.alert('Thank you! 🎉', 'Your feedback has been recorded.');
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to submit rating';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
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
  const isStudent = userInfo?.role === 'student';
  const isResolved = ['RESOLVED', 'CLOSED'].includes(ticket.status);
  const canRate = isStudent && isResolved && (ticket.rating === null || ticket.rating === undefined);
  const alreadyRated = isStudent && isResolved && ticket.rating != null;

  const statusColor = {
    OPEN:        '#3498DB',
    IN_PROGRESS: '#F39C12',
    ESCALATED:   '#E74C3C',
    RESOLVED:    '#27AE60',
    CLOSED:      '#7F8C8D',
  }[ticket.status] || '#3498DB';

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <View>
            {/* ── Ticket Header Card ── */}
            <View style={[styles.headerCard, { borderTopColor: statusColor }]}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{ticket.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusText}>{ticket.status}</Text>
                </View>
              </View>
              <Text style={styles.deptText}>{ticket.department?.name} • {ticket.inquiryType?.name}</Text>
              <Text style={styles.desc}>{ticket.description}</Text>

              {ticket.slaPolicy && (
                <View style={styles.slaInfo}>
                  <Ionicons name="shield-checkmark" size={14} color="#C0392B" />
                  <Text style={styles.slaText}>SLA: {ticket.slaPolicy.name}</Text>
                </View>
              )}

              <Text style={styles.date}>Created by {ticket.student?.name} on {new Date(ticket.createdAt).toLocaleString()}</Text>
            </View>

            {/* ── Student Rating Section ── */}
            {isStudent && isResolved && (
              <View style={styles.ratingCard}>
                <View style={styles.ratingHeaderRow}>
                  <Ionicons name="star" size={18} color="#F39C12" />
                  <Text style={styles.ratingTitle}>Satisfaction Rating</Text>
                </View>

                {alreadyRated ? (
                  <View style={styles.ratedBox}>
                    <StarRating value={ticket.rating} disabled size={28} />
                    <Text style={styles.ratedLabel}>
                      You rated this ticket {ticket.rating}/5 ⭐
                    </Text>
                    {ticket.ratingComment ? (
                      <Text style={styles.ratedComment}>"{ticket.ratingComment}"</Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.ratePrompt}>
                    <Text style={styles.ratePromptText}>
                      How satisfied are you with the resolution?
                    </Text>
                    <TouchableOpacity
                      style={styles.rateBtn}
                      onPress={() => { setSelectedRating(0); setRatingComment(''); setRatingModal(true); }}
                    >
                      <Ionicons name="star-outline" size={18} color="#FFF" />
                      <Text style={styles.rateBtnText}>Rate this ticket</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ── Action Buttons (Staff / Admin) ── */}
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

      {/* Comment Input */}
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

      {/* ── Rating Modal ── */}
      <Modal visible={ratingModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.ratingModalContent]}>
              <Text style={styles.modalTitle}>Rate Your Experience</Text>
              <Text style={styles.ratingSubtitle}>Tap a star to rate your satisfaction</Text>

              <StarRating value={selectedRating} onChange={setSelectedRating} size={40} />

              <Text style={styles.ratingLabel}>
                {selectedRating === 0 ? 'Select a rating' :
                 selectedRating === 1 ? '😞 Very Unsatisfied' :
                 selectedRating === 2 ? '😐 Unsatisfied' :
                 selectedRating === 3 ? '🙂 Neutral' :
                 selectedRating === 4 ? '😊 Satisfied' :
                 '🤩 Very Satisfied'}
              </Text>

              <TextInput
                style={styles.ratingInput}
                placeholder="Optional: share more about your experience..."
                value={ratingComment}
                onChangeText={setRatingComment}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalRow}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setRatingModal(false)}>
                  <Text style={{ color: '#7F8C8D', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmit, styles.ratingSubmitBtn, selectedRating === 0 && styles.disabledBtn]}
                  onPress={handleSubmitRating}
                  disabled={submitting || selectedRating === 0}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Submit Rating</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Escalate Modal ── */}
      <Modal visible={escalateModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
                  <Text style={{ color: '#FFF' }}>Escalate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Approve Modal ── */}
      <Modal visible={approveModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
                  <Text style={{ color: '#FFF' }}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── SLA Modal ── */}
      <Modal visible={slaModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select SLA Policy</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {policies.map(p => (
                <TouchableOpacity key={p._id} style={styles.policyItem} onPress={() => handleAttachSLA(p._id)}>
                  <Text style={styles.policyName}>{p.name}</Text>
                  <Text style={styles.policyTimes}>{p.responseTime}h response / {p.resolutionTime}h resolution</Text>
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

  // Header card
  headerCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6ED',
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  deptText: { fontSize: 13, fontWeight: 'bold', color: '#3498DB', marginBottom: 8 },
  desc: { fontSize: 15, color: '#34495E', marginBottom: 12, lineHeight: 22 },
  slaInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDEDEC', padding: 6, borderRadius: 6, marginBottom: 10 },
  slaText: { color: '#C0392B', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  date: { fontSize: 12, color: '#7F8C8D' },

  // Rating card
  ratingCard: {
    backgroundColor: '#FFFBF0',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F39C12',
  },
  ratingHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  ratingTitle: { fontSize: 15, fontWeight: 'bold', color: '#D35400', marginLeft: 8 },
  ratedBox: { alignItems: 'center' },
  ratedLabel: { fontSize: 13, color: '#E67E22', fontWeight: '600', marginTop: 6 },
  ratedComment: { fontSize: 12, color: '#7F8C8D', fontStyle: 'italic', marginTop: 4, textAlign: 'center' },
  ratePrompt: { alignItems: 'center' },
  ratePromptText: { fontSize: 13, color: '#7F8C8D', marginBottom: 12, textAlign: 'center' },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F39C12',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  rateBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  // Actions
  actionContainer: { padding: 12, flexDirection: 'row', gap: 10 },
  escalateBtn: { backgroundColor: '#E67E22', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, flex: 1, justifyContent: 'center', gap: 6 },
  adminActions: { flex: 1, flexDirection: 'row', gap: 10 },
  approveBtn: { flex: 1, backgroundColor: '#27AE60', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, justifyContent: 'center', gap: 6 },
  slaBtn: { flex: 1, backgroundColor: '#C0392B', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, justifyContent: 'center', gap: 6 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  // Comments
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50', marginHorizontal: 16, marginTop: 6, marginBottom: 8 },
  commentsList: { paddingHorizontal: 12, paddingBottom: 20 },
  commentCard: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#3498DB' },
  commentAuthor: { fontSize: 12, fontWeight: 'bold', color: '#2C3E50', marginBottom: 3 },
  commentText: { fontSize: 14, color: '#34495E', marginBottom: 4 },
  commentDate: { fontSize: 10, color: '#BDC3C7', textAlign: 'right' },
  emptyText: { textAlign: 'center', color: '#7F8C8D', marginTop: 20, fontSize: 14 },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E0E6ED', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F5F7FA', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100 },
  sendButton: { backgroundColor: '#3498DB', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  ratingModalContent: { paddingBottom: 32 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6, textAlign: 'center', color: '#2C3E50' },
  ratingSubtitle: { fontSize: 13, color: '#7F8C8D', textAlign: 'center', marginBottom: 10 },
  ratingLabel: { fontSize: 16, textAlign: 'center', marginVertical: 6, color: '#E67E22', fontWeight: '600' },
  ratingInput: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 12, minHeight: 70, textAlignVertical: 'top', marginBottom: 16, marginTop: 8, fontSize: 13 },
  modalInput: { backgroundColor: '#F5F7FA', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top', marginBottom: 15 },
  modalRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#ECF0F1', borderRadius: 10 },
  modalSubmit: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#E67E22', borderRadius: 10 },
  ratingSubmitBtn: { backgroundColor: '#F39C12' },
  disabledBtn: { opacity: 0.4 },
  statusRow: { flexDirection: 'row', gap: 6, marginBottom: 15 },
  statusBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#3498DB', borderRadius: 8 },
  statusBtnActive: { backgroundColor: '#3498DB' },
  statusBtnText: { fontSize: 10, color: '#3498DB', fontWeight: 'bold' },
  statusBtnTextActive: { color: '#FFF' },
  policyItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F5F7FA' },
  policyName: { fontWeight: 'bold', color: '#2C3E50' },
  policyTimes: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },
});

export default TicketDetailScreen;

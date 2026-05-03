import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { getTickets } from '../services/ticketService';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const POLL_INTERVAL = 30000;

const STATUS_COLORS = {
  OPEN:        '#3498DB',
  IN_PROGRESS: '#F39C12',
  RESOLVED:    '#27AE60',
  CLOSED:      '#7F8C8D',
  ESCALATED:   '#E74C3C',
};

// ─── PDF HTML builder ────────────────────────────────────────────────────────
const buildTicketsPDF = (tickets) => {
  const rows = tickets.map((t, idx) => {
    const statusColor = {
      OPEN: '#3498DB', IN_PROGRESS: '#E67E22', ESCALATED: '#E74C3C',
      RESOLVED: '#27AE60', CLOSED: '#7F8C8D',
    }[t.status] || '#7F8C8D';

    return `
      <tr>
        <td>${idx + 1}</td>
        <td><b>${t.title || '—'}</b></td>
        <td>${t.student?.name || 'N/A'}<br/><small style="color:#7F8C8D">${t.student?.email || ''}</small></td>
        <td>${t.department?.name || '—'}</td>
        <td>${t.inquiryType?.name || '—'}</td>
        <td><span style="background:${statusColor};color:#fff;padding:3px 8px;border-radius:10px;font-size:10px;font-weight:bold">${t.status}</span></td>
        <td>${t.slaPolicy?.name || 'None'}</td>
        <td>${t.rating != null ? '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating) + ` (${t.rating}/5)` : '—'}</td>
        <td>${t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : '—'}</td>
      </tr>`;
  }).join('');

  const byStatus = {};
  tickets.forEach(t => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });
  const statsSummary = Object.entries(byStatus)
    .map(([s, c]) => `<span style="margin-right:16px"><b>${c}</b> ${s.replace('_', ' ')}</span>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>EduConnect Ticket Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Helvetica, sans-serif; background: #F5F7FA; color: #2C3E50; }
    .banner { background: #2C3E50; color: #fff; padding: 28px 32px; }
    .banner h1 { font-size: 24px; }
    .banner p { font-size: 11px; color: rgba(255,255,255,.6); margin-top: 5px; }
    .page { padding: 20px 24px; }
    .summary { background: #fff; border-radius: 8px; padding: 12px 18px; margin-bottom: 20px;
               font-size: 12px; border-left: 4px solid #3498DB; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #34495E; color: #fff; padding: 9px 10px; text-align: left; }
    td { padding: 8px 10px; border-bottom: 1px solid #ECF0F1; vertical-align: middle; }
    tr:nth-child(even) td { background: #F8F9FA; }
    .footer { border-top: 1px solid #ECF0F1; margin-top: 24px; padding-top: 10px;
              font-size: 10px; color: #BDC3C7; text-align: center; }
  </style>
</head>
<body>
  <div class="banner">
    <h1>🎫 EduConnect — Ticket Report</h1>
    <p>Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; Total: ${tickets.length} tickets</p>
  </div>
  <div class="page">
    <div class="summary"><b>Status Summary:</b> &nbsp; ${statsSummary}</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Title</th><th>Student</th><th>Department</th>
          <th>Inquiry Type</th><th>Status</th><th>SLA</th><th>Rating</th><th>Created</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">EduConnect · Confidential Admin Report · ${new Date().toLocaleDateString()}</div>
  </div>
</body>
</html>`;
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const TicketsScreen = ({ navigation }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const pollRef = useRef(null);
  const { userInfo } = useContext(AuthContext);

  const isAdmin = userInfo?.role === 'admin';

  const fetchTickets = async (silent = false) => {
    try {
      const data = await getTickets();
      setTickets(data);
    } catch (error) {
      console.log('Error fetching tickets', error);
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      fetchTickets();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => fetchTickets(true), POLL_INTERVAL);
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
    fetchTickets();
  };

  // ─── PDF Export (uses expo-print — works on both native & web) ────────────
  const handleDownloadPDF = async () => {
    if (tickets.length === 0) {
      Alert.alert('No Data', 'There are no tickets to export.');
      return;
    }
    setPdfLoading(true);
    try {
      const html = buildTicketsPDF(tickets);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'EduConnect Ticket Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', `PDF saved to:\n${uri}`);
      }
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Error', 'Failed to generate the PDF report.');
    } finally {
      setPdfLoading(false);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────
  const getStatusColor = (status) => STATUS_COLORS[status] || '#3498DB';

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: getStatusColor(item.status) }]}
      onPress={() => navigation.navigate('TicketDetail', { ticketId: item._id })}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.deptText}>{item.department?.name} • {item.inquiryType?.name}</Text>
      <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>

      <View style={styles.cardFooter}>
        {item.student?.name ? (
          <Text style={styles.studentText}>👤 {item.student.name}</Text>
        ) : null}
        <View style={styles.footerRight}>
          {item.rating != null && (
            <Text style={styles.ratingText}>
              {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
            </Text>
          )}
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Admin toolbar */}
      {isAdmin && (
        <View style={styles.toolbar}>
          <View>
            <Text style={styles.toolbarTitle}>All Tickets</Text>
            <Text style={styles.toolbarCount}>
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} total
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.pdfBtn, pdfLoading && styles.pdfBtnDisabled]}
            onPress={handleDownloadPDF}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color="#FFF" />
                <Text style={styles.pdfBtnText}>Export PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={tickets}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No tickets found.</Text>}
      />

      {/* FAB: students only */}
      {userInfo?.role === 'student' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateTicket')}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2C3E50',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toolbarTitle:  { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  toolbarCount:  { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
    elevation: 4,
    shadowColor: '#E74C3C',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  pdfBtnDisabled: { opacity: 0.6 },
  pdfBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  listContainer: { padding: 14, paddingBottom: 90 },
  card: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  title: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.4 },
  deptText: { fontSize: 11, color: '#3498DB', fontWeight: '600', marginBottom: 5 },
  desc: { fontSize: 13, color: '#7F8C8D', marginBottom: 10, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  studentText: { fontSize: 11, color: '#95A5A6' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingText: { fontSize: 12, color: '#F39C12' },
  date: { fontSize: 11, color: '#BDC3C7' },

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
  emptyText: { textAlign: 'center', color: '#7F8C8D', marginTop: 40, fontSize: 15 },
});

export default TicketsScreen;

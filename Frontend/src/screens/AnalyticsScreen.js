import React, { useState, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity, Alert, Dimensions,
} from 'react-native';
import { getAnalytics } from '../services/analyticsService';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 160;
const POLL_INTERVAL = 30_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtHours = (h) => {
  if (h == null) return 'N/A';
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h.toFixed(1)} hrs`;
};

const fmtRating = (r) => (r == null ? 'N/A' : `${r.toFixed(1)} / 5`);

const renderStars = (rating) => {
  if (rating == null) return '—';
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, subValue, accent, wide }) => (
  <View style={[kpiStyles.card, wide && kpiStyles.wide, { borderTopColor: accent }]}>
    <View style={[kpiStyles.iconWrap, { backgroundColor: accent + '20' }]}>
      <Ionicons name={icon} size={20} color={accent} />
    </View>
    <Text style={kpiStyles.label}>{label}</Text>
    <Text style={[kpiStyles.value, { color: accent }]}>{value}</Text>
    {subValue ? <Text style={kpiStyles.sub}>{subValue}</Text> : null}
  </View>
);

const kpiStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderTopWidth: 3,
    width: (SCREEN_WIDTH - 48) / 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  wide: { width: SCREEN_WIDTH - 32 },
  iconWrap: { borderRadius: 8, padding: 6, alignSelf: 'flex-start', marginBottom: 8 },
  label: { fontSize: 11, color: '#7F8C8D', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 22, fontWeight: 'bold' },
  sub: { fontSize: 11, color: '#95A5A6', marginTop: 3 },
});

// ─── Volume Chart (custom bar) ────────────────────────────────────────────────
const VolumeChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <Text style={{ color: '#7F8C8D', textAlign: 'center', padding: 20 }}>No data available</Text>;
  }

  const maxVal = Math.max(...data.map(d => d.count), 1);
  const barWidth = Math.max(6, (SCREEN_WIDTH - 64) / data.length - 2);

  // Show every 5th label to avoid clutter
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={chartStyles.wrapper}>
          {/* Y-axis labels */}
          <View style={[chartStyles.yAxis, { height: CHART_HEIGHT }]}>
            {[maxVal, Math.round(maxVal / 2), 0].map((v, i) => (
              <Text key={i} style={chartStyles.yLabel}>{v}</Text>
            ))}
          </View>

          {/* Bars + x labels */}
          <View>
            <View style={[chartStyles.barsRow, { height: CHART_HEIGHT }]}>
              {data.map((item, idx) => {
                const barH = Math.max(4, (item.count / maxVal) * CHART_HEIGHT);
                const isHighest = item.count === maxVal;
                return (
                  <View key={idx} style={[chartStyles.barCol, { width: barWidth + 2 }]}>
                    {isHighest && (
                      <Text style={[chartStyles.peakLabel, { width: barWidth + 10 }]}>{item.count}</Text>
                    )}
                    <View
                      style={[
                        chartStyles.bar,
                        {
                          height: barH,
                          width: barWidth,
                          backgroundColor: isHighest ? '#E74C3C' : '#3498DB',
                          opacity: 0.85 + (item.count / maxVal) * 0.15,
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>

            {/* X labels (every 5th day) */}
            <View style={[chartStyles.xRow, { paddingLeft: 2 }]}>
              {data.map((item, idx) => (
                <View key={idx} style={{ width: barWidth + 2 }}>
                  {idx % 5 === 0 && (
                    <Text style={[chartStyles.xLabel, { width: 36, marginLeft: -10 }]}>
                      {item.date.slice(5)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Summary row */}
      <View style={chartStyles.summaryRow}>
        <View style={chartStyles.summaryItem}>
          <Text style={chartStyles.summaryVal}>{data.reduce((s, d) => s + d.count, 0)}</Text>
          <Text style={chartStyles.summaryLbl}>Total (30d)</Text>
        </View>
        <View style={chartStyles.summaryItem}>
          <Text style={chartStyles.summaryVal}>
            {Math.round(data.reduce((s, d) => s + d.count, 0) / data.length)}
          </Text>
          <Text style={chartStyles.summaryLbl}>Avg / Day</Text>
        </View>
        <View style={chartStyles.summaryItem}>
          <Text style={[chartStyles.summaryVal, { color: '#E74C3C' }]}>{Math.max(...data.map(d => d.count))}</Text>
          <Text style={chartStyles.summaryLbl}>Peak Day</Text>
        </View>
      </View>
    </View>
  );
};

const chartStyles = StyleSheet.create({
  wrapper: { flexDirection: 'row', paddingVertical: 4 },
  yAxis: { justifyContent: 'space-between', paddingRight: 4, alignItems: 'flex-end' },
  yLabel: { fontSize: 9, color: '#BDC3C7', width: 24, textAlign: 'right' },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 4 },
  barCol: { alignItems: 'center', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 4 },
  peakLabel: { fontSize: 8, color: '#E74C3C', fontWeight: 'bold', textAlign: 'center', marginBottom: 1 },
  xRow: { flexDirection: 'row', marginTop: 4 },
  xLabel: { fontSize: 8, color: '#95A5A6', textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F3F7' },
  summaryItem: { alignItems: 'center' },
  summaryVal: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  summaryLbl: { fontSize: 10, color: '#7F8C8D', marginTop: 2 },
});

// ─── Status bar chart ─────────────────────────────────────────────────────────
const StatusBarChart = ({ data, maxValue }) => (
  <View style={barStyles.container}>
    {data.map((item, idx) => {
      const pct = (item.value / Math.max(maxValue, 1)) * 100;
      return (
        <View key={idx} style={barStyles.row}>
          <Text style={barStyles.rowLabel}>{item.label}</Text>
          <View style={barStyles.track}>
            <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: item.color }]} />
          </View>
          <Text style={[barStyles.val, { color: item.color }]}>{item.value}</Text>
        </View>
      );
    })}
  </View>
);

const barStyles = StyleSheet.create({
  container: { marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rowLabel: { width: 78, fontSize: 11, color: '#7F8C8D', fontWeight: '600' },
  track: { flex: 1, height: 12, backgroundColor: '#F0F3F7', borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  val: { width: 34, textAlign: 'right', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AnalyticsScreen = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);

  const fetchData = async (silent = false) => {
    try {
      const data = await getAnalytics();
      setAnalytics(data);
      setLastUpdated(new Date());
    } catch (error) {
      if (!silent) Alert.alert('Error', 'Failed to load analytics. You might not be authorized.');
      console.log(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      fetchData();
      pollRef.current = setInterval(() => fetchData(true), POLL_INTERVAL);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [])
  );

  // ── PDF Generation ──────────────────────────────────────────────────────────
  const generatePDF = async () => {
    if (!analytics) return;
    setPdfLoading(true);

    const a = analytics;
    const vol = a.tickets.volumeByDate || [];
    const totalVol = vol.reduce((s, d) => s + d.count, 0);
    const peakDay = vol.length ? vol.reduce((p, c) => c.count > p.count ? c : p, vol[0]) : null;

    const volRows = vol.map(d => `
      <tr>
        <td>${d.date}</td>
        <td style="text-align:center; font-weight:bold; color:${d.count === (peakDay?.count || 0) && d.count > 0 ? '#E74C3C' : '#2C3E50'}">
          ${d.count}
        </td>
        <td style="padding:4px 8px;">
          <div style="background:#3498DB; height:10px; border-radius:4px; width:${Math.round((d.count / Math.max(peakDay?.count || 1, 1)) * 100)}%;"></div>
        </td>
      </tr>`).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>EduConnect Analytics Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Helvetica, sans-serif; background: #F5F7FA; color: #2C3E50; }

    /* Cover banner */
    .banner {
      background: linear-gradient(135deg, #2C3E50 0%, #34495E 100%);
      color: white; padding: 32px 36px; margin-bottom: 0;
    }
    .banner h1 { font-size: 26px; letter-spacing: 1px; }
    .banner p  { font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 6px; }

    .page { padding: 24px 28px; }

    /* KPI grid */
    .kpi-grid { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 28px; }
    .kpi { background: white; border-radius: 10px; padding: 16px 20px; flex: 1;
           min-width: 150px; border-top: 4px solid; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .kpi .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #7F8C8D; margin-bottom: 6px; }
    .kpi .val { font-size: 28px; font-weight: bold; }
    .kpi .sub { font-size: 11px; color: #95A5A6; margin-top: 4px; }

    /* Section header */
    .section-title {
      font-size: 14px; font-weight: bold; color: #2C3E50;
      border-left: 4px solid #3498DB; padding-left: 10px;
      margin-bottom: 14px; margin-top: 8px;
    }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
    th { background: #34495E; color: white; padding: 9px 12px; text-align: left; }
    td { padding: 8px 12px; border-bottom: 1px solid #ECF0F1; }
    tr:nth-child(even) td { background: #F8F9FA; }
    tr:hover td { background: #EBF5FB; }

    /* Stars */
    .stars { color: #F39C12; font-size: 16px; }

    /* Footer */
    .footer { border-top: 1px solid #ECF0F1; margin-top: 28px; padding-top: 12px;
              font-size: 10px; color: #BDC3C7; text-align: center; }
  </style>
</head>
<body>

<div class="banner">
  <h1>📊 EduConnect Analytics Report</h1>
  <p>Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; Admin Dashboard</p>
</div>

<div class="page">

  <!-- KPI Grid -->
  <div class="kpi-grid">
    <div class="kpi" style="border-top-color:#3498DB">
      <div class="lbl">Total Tickets</div>
      <div class="val" style="color:#3498DB">${a.tickets.total}</div>
    </div>
    <div class="kpi" style="border-top-color:#27AE60">
      <div class="lbl">Avg Resolution Time</div>
      <div class="val" style="color:#27AE60">${fmtHours(a.tickets.avgResolutionTimeHours)}</div>
    </div>
    <div class="kpi" style="border-top-color:#F39C12">
      <div class="lbl">Avg Satisfaction Rating</div>
      <div class="val" style="color:#F39C12">${fmtRating(a.tickets.avgRating)}</div>
      <div class="sub">${a.tickets.ratedCount} ratings</div>
    </div>
    <div class="kpi" style="border-top-color:#8E44AD">
      <div class="lbl">Total Bookings</div>
      <div class="val" style="color:#8E44AD">${a.bookings.total}</div>
    </div>
  </div>

  <!-- Ticket Status Breakdown -->
  <div class="section-title">Ticket Status Breakdown</div>
  <table>
    <thead><tr><th>Status</th><th>Count</th><th>% of Total</th></tr></thead>
    <tbody>
      ${['OPEN','IN_PROGRESS','ESCALATED','RESOLVED','CLOSED'].map(s => `
        <tr>
          <td>${s.replace('_',' ')}</td>
          <td><b>${a.tickets.byStatus[s] || 0}</b></td>
          <td>${a.tickets.total > 0 ? ((a.tickets.byStatus[s] || 0) / a.tickets.total * 100).toFixed(1) : 0}%</td>
        </tr>`).join('')}
    </tbody>
  </table>

  <!-- Ticket Volume (30-Day) -->
  <div class="section-title">Ticket Volume — Last 30 Days</div>
  <table>
    <thead><tr><th>Date</th><th>Tickets</th><th>Volume Bar</th></tr></thead>
    <tbody>${volRows}</tbody>
  </table>
  <p style="font-size:11px; color:#7F8C8D; margin-top:-18px; margin-bottom:24px;">
    Total: <b>${totalVol}</b> tickets &nbsp;|&nbsp;
    Peak: <b>${peakDay ? `${peakDay.date} (${peakDay.count})` : 'N/A'}</b> &nbsp;|&nbsp;
    Daily avg: <b>${vol.length ? Math.round(totalVol / vol.length) : 0}</b>
  </p>

  <!-- Booking Status Breakdown -->
  <div class="section-title">Booking Status Breakdown</div>
  <table>
    <thead><tr><th>Status</th><th>Count</th><th>% of Total</th></tr></thead>
    <tbody>
      ${['PENDING','APPROVED','REJECTED','CANCELLED'].map(s => `
        <tr>
          <td>${s}</td>
          <td><b>${a.bookings.byStatus[s] || 0}</b></td>
          <td>${a.bookings.total > 0 ? ((a.bookings.byStatus[s] || 0) / a.bookings.total * 100).toFixed(1) : 0}%</td>
        </tr>`).join('')}
    </tbody>
  </table>

  <div class="footer">EduConnect · Confidential Admin Report · ${new Date().toLocaleDateString()}</div>
</div>
</body>
</html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'EduConnect Analytics Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Downloaded', `Saved to: ${uri}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not generate PDF');
      console.error(error);
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Loading analytics…</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#E74C3C" />
        <Text style={styles.errorText}>No data available or unauthorized.</Text>
      </View>
    );
  }

  const { tickets, bookings } = analytics;

  const ticketStatusData = [
    { label: 'Open',        value: tickets.byStatus.OPEN        || 0, color: '#3498DB' },
    { label: 'In Progress', value: tickets.byStatus.IN_PROGRESS || 0, color: '#F39C12' },
    { label: 'Escalated',   value: tickets.byStatus.ESCALATED   || 0, color: '#E74C3C' },
    { label: 'Resolved',    value: tickets.byStatus.RESOLVED    || 0, color: '#27AE60' },
    { label: 'Closed',      value: tickets.byStatus.CLOSED      || 0, color: '#7F8C8D' },
  ];

  const bookingStatusData = [
    { label: 'Pending',   value: bookings.byStatus.PENDING    || 0, color: '#F1C40F' },
    { label: 'Approved',  value: bookings.byStatus.APPROVED   || 0, color: '#2ECC71' },
    { label: 'Rejected',  value: bookings.byStatus.REJECTED   || 0, color: '#E74C3C' },
    { label: 'Cancelled', value: bookings.byStatus.CANCELLED  || 0, color: '#7F8C8D' },
  ];

  const maxTicketStatus = Math.max(...ticketStatusData.map(d => d.value), 1);
  const maxBookingStatus = Math.max(...bookingStatusData.map(d => d.value), 1);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Analytics Dashboard</Text>
          {lastUpdated && (
            <Text style={styles.live}>🟢 Live · {lastUpdated.toLocaleTimeString()}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.pdfBtn, pdfLoading && { opacity: 0.6 }]}
          onPress={generatePDF}
          disabled={pdfLoading}
        >
          {pdfLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={16} color="#FFF" />
              <Text style={styles.pdfBtnText}>Export PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── KPI Cards Row 1 ── */}
      <View style={styles.kpiRow}>
        <KpiCard
          icon="ticket-outline"
          label="TOTAL TICKETS"
          value={tickets.total}
          accent="#3498DB"
        />
        <KpiCard
          icon="time-outline"
          label="AVG RESOLUTION TIME"
          value={fmtHours(tickets.avgResolutionTimeHours)}
          subValue={tickets.avgResolutionTimeHours == null ? 'No resolved tickets yet' : undefined}
          accent="#27AE60"
        />
      </View>

      {/* ── KPI Cards Row 2 ── */}
      <View style={styles.kpiRow}>
        <KpiCard
          icon="star-outline"
          label="AVG SATISFACTION"
          value={fmtRating(tickets.avgRating)}
          subValue={tickets.ratedCount > 0 ? `${tickets.ratedCount} ratings` : 'No ratings yet'}
          accent="#F39C12"
        />
        <KpiCard
          icon="calendar-outline"
          label="TOTAL BOOKINGS"
          value={bookings.total}
          accent="#8E44AD"
        />
      </View>

      {/* ── Ticket Volume Chart ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="bar-chart-outline" size={18} color="#3498DB" />
          <Text style={styles.cardTitle}>Ticket Volume — Last 30 Days</Text>
        </View>
        <VolumeChart data={tickets.volumeByDate} />
      </View>

      {/* ── Ticket Status Breakdown ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="pie-chart-outline" size={18} color="#E74C3C" />
          <Text style={styles.cardTitle}>Ticket Status Breakdown</Text>
        </View>
        <StatusBarChart data={ticketStatusData} maxValue={maxTicketStatus} />
      </View>

      {/* ── Booking Status Breakdown ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="checkmark-done-outline" size={18} color="#27AE60" />
          <Text style={styles.cardTitle}>Booking Status Breakdown</Text>
        </View>
        <StatusBarChart data={bookingStatusData} maxValue={maxBookingStatus} />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F3F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#7F8C8D', marginTop: 10 },
  errorText: { color: '#E74C3C', marginTop: 10, fontSize: 15 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2C3E50',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  live: { fontSize: 11, color: '#2ECC71', marginTop: 3 },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#E74C3C',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  pdfBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50' },
});

export default AnalyticsScreen;

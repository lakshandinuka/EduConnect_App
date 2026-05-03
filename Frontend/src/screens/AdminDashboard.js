import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

const QuickCard = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={[styles.card, { borderLeftColor: color }]} onPress={onPress}>
    <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.cardLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color="#BDC3C7" />
  </TouchableOpacity>
);

const AdminDashboard = ({ navigation }) => {
  const { userInfo, logout } = useContext(AuthContext);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{userInfo?.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>ADMIN</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#E74C3C" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>TICKET MANAGEMENT</Text>
        <QuickCard
          icon="list-outline"
          label="All Tickets"
          color="#3498DB"
          onPress={() => navigation.navigate('Tickets')}
        />

        <Text style={styles.sectionTitle}>BOOKING MANAGEMENT</Text>
        <QuickCard
          icon="calendar-outline"
          label="Manage Booking Requests"
          color="#E67E22"
          onPress={() => navigation.navigate('ManageBookings')}
        />
        <QuickCard
          icon="time-outline"
          label="Manage Time Slots"
          color="#9B59B6"
          onPress={() => navigation.navigate('ManageTimeSlots')}
        />

        <Text style={styles.sectionTitle}>CONFIGURATION</Text>
        <QuickCard
          icon="business-outline"
          label="Manage Departments"
          color="#2980B9"
          onPress={() => navigation.navigate('ManageDepartments')}
        />
        <QuickCard
          icon="help-circle-outline"
          label="Manage Inquiry Types"
          color="#8E44AD"
          onPress={() => navigation.navigate('ManageInquiryTypes')}
        />
        <QuickCard
          icon="shield-checkmark-outline"
          label="Manage SLA Policies"
          color="#C0392B"
          onPress={() => navigation.navigate('ManageSLAPolicies')}
        />

        <Text style={styles.sectionTitle}>COMMUNICATION</Text>
        <QuickCard
          icon="megaphone-outline"
          label="View Announcements"
          color="#1ABC9C"
          onPress={() => navigation.navigate('Announcements')}
        />
        <QuickCard
          icon="create-outline"
          label="Post Announcement"
          color="#27AE60"
          onPress={() => navigation.navigate('CreateAnnouncement')}
        />

        <Text style={styles.sectionTitle}>ANALYTICS</Text>
        <QuickCard
          icon="bar-chart-outline"
          label="Live Analytics Dashboard"
          color="#E74C3C"
          onPress={() => navigation.navigate('Analytics')}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 30,
    backgroundColor: '#2C3E50',
  },
  greeting: { fontSize: 16, color: 'rgba(255,255,255,0.7)' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginVertical: 4 },
  roleBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#7F8C8D',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconWrap: { borderRadius: 10, padding: 8, marginRight: 14 },
  cardLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#2C3E50' },
});

export default AdminDashboard;

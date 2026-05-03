import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

const formatRole = (role) => {
  if (!role) return 'User';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const ProfileScreen = () => {
  const { userInfo, logout, isLoading } = useContext(AuthContext);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={42} color="#3498DB" />
        </View>
        <Text style={styles.name}>{userInfo?.name || 'User'}</Text>
        <Text style={styles.role}>{formatRole(userInfo?.role)}</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={20} color="#7F8C8D" />
          <View style={styles.detailText}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{userInfo?.name || 'Not available'}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={20} color="#7F8C8D" />
          <View style={styles.detailText}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{userInfo?.email || 'Not available'}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#7F8C8D" />
          <View style={styles.detailText}>
            <Text style={styles.label}>Role</Text>
            <Text style={styles.value}>{formatRole(userInfo?.role)}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, isLoading && styles.logoutButtonDisabled]}
        onPress={logout}
        disabled={isLoading}
      >
        <Ionicons name="log-out-outline" size={20} color="#FFF" />
        <Text style={styles.logoutText}>{isLoading ? 'Logging out...' : 'Logout'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  name: {
    color: '#2C3E50',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  role: {
    color: '#3498DB',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  details: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  detailText: {
    flex: 1,
    marginLeft: 12,
  },
  label: {
    color: '#95A5A6',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  value: {
    color: '#2C3E50',
    fontSize: 16,
    marginTop: 4,
  },
  logoutButton: {
    marginTop: 24,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;

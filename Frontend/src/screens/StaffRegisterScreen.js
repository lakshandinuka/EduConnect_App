import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

const ROLES = [
  { key: 'staff', label: 'Staff', icon: 'people-outline', color: '#27AE60' },
  { key: 'admin', label: 'Administrator', icon: 'shield-checkmark-outline', color: '#8E44AD' },
];

const StaffRegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [selectedRole, setSelectedRole] = useState('staff');
  const [showPassword, setShowPassword] = useState(false);
  const { registerStaff, isLoading } = useContext(AuthContext);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    try {
      await registerStaff(name, email, password, selectedRole, department);
      Alert.alert(
        'Account Created',
        `${selectedRole === 'admin' ? 'Administrator' : 'Staff'} account for ${name} has been created successfully.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        error.response?.data?.message || 'Something went wrong. Make sure you are logged in as an Admin.'
      );
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#2C3E50" />
            </TouchableOpacity>
            <View style={styles.headerBadge}>
              <Ionicons name="shield-checkmark" size={36} color="#8E44AD" />
            </View>
            <Text style={styles.title}>Staff / Admin Portal</Text>
            <Text style={styles.subtitle}>
              Create an account for a team member.{'\n'}This form is restricted to Administrators.
            </Text>
          </View>

          {/* Role Selector */}
          <Text style={styles.sectionLabel}>Select Role</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.roleCard,
                  selectedRole === r.key && { borderColor: r.color, backgroundColor: r.color + '18' },
                ]}
                onPress={() => setSelectedRole(r.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={r.icon}
                  size={28}
                  color={selectedRole === r.key ? r.color : '#BDC3C7'}
                />
                <Text style={[styles.roleLabel, selectedRole === r.key && { color: r.color, fontWeight: '700' }]}>
                  {r.label}
                </Text>
                {selectedRole === r.key && (
                  <Ionicons name="checkmark-circle" size={18} color={r.color} style={styles.roleCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <Text style={styles.sectionLabel}>Account Details</Text>
          <View style={styles.card}>
            {/* Name */}
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name *"
                placeholderTextColor="#BDC3C7"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email */}
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address *"
                placeholderTextColor="#BDC3C7"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Department */}
            <View style={styles.inputWrapper}>
              <Ionicons name="business-outline" size={18} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Department (optional)"
                placeholderTextColor="#BDC3C7"
                value={department}
                onChangeText={setDepartment}
              />
            </View>

            {/* Password */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Password *"
                placeholderTextColor="#BDC3C7"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#7F8C8D" />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View style={[styles.inputWrapper, { marginBottom: 0 }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Confirm Password *"
                placeholderTextColor="#BDC3C7"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>
          </View>

          {/* Notice */}
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={16} color="#8E44AD" />
            <Text style={styles.noticeText}>
              You must be logged in as an Administrator to create staff or admin accounts.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>
                  Create {selectedRole === 'admin' ? 'Administrator' : 'Staff'} Account
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Registering as a student? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Student Sign Up</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F0F2F8' },
  container: {
    flexGrow: 1,
    padding: 22,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 10,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 6,
    marginBottom: 10,
  },
  headerBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7F8C8D',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E0E6ED',
    padding: 16,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  roleLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  roleCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E6ED',
    marginBottom: 12,
    paddingHorizontal: 12,
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
  inputFlex: { flex: 1 },
  eyeBtn: {
    padding: 4,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#6C3483',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#8E44AD',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: '#7F8C8D',
    fontSize: 14,
  },
  link: {
    color: '#3498DB',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default StaffRegisterScreen;

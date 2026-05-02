import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Dashboards
import StudentDashboard from '../screens/StudentDashboard';
import StaffDashboard from '../screens/StaffDashboard';
import AdminDashboard from '../screens/AdminDashboard';

// Shared / Modular Screens
import TicketsScreen from '../screens/TicketsScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';
import CreateTicketScreen from '../screens/CreateTicketScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import CreateAnnouncementScreen from '../screens/CreateAnnouncementScreen';
import BookingsScreen from '../screens/BookingsScreen';
import CreateBookingScreen from '../screens/CreateBookingScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';

// Management Screens
import ManageTimeSlotsScreen from '../screens/ManageTimeSlotsScreen';
import ManageBookingsScreen from '../screens/ManageBookingsScreen';
import ManageDepartmentsScreen from '../screens/ManageDepartmentsScreen';
import ManageInquiryTypesScreen from '../screens/ManageInquiryTypesScreen';
import ManageSLAPoliciesScreen from '../screens/ManageSLAPoliciesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- TICKET STACK ---
const TicketStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="TicketsList" component={TicketsScreen} options={{ title: 'Support Tickets' }} />
    <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: 'Ticket Details' }} />
    <Stack.Screen name="CreateTicket" component={CreateTicketScreen} options={{ title: 'New Ticket' }} />
  </Stack.Navigator>
);

// --- BOOKING STACK ---
const BookingStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="MyBookings" component={BookingsScreen} options={{ title: 'My Appointments' }} />
    <Stack.Screen name="CreateBooking" component={CreateBookingScreen} options={{ title: 'Book Appointment' }} />
  </Stack.Navigator>
);

// --- STUDENT NAVIGATOR ---
const StudentTabs = () => (
  <Tab.Navigator screenOptions={({ route }) => ({
    tabBarIcon: ({ color, size }) => {
      let iconName;
      if (route.name === 'Home') iconName = 'home';
      else if (route.name === 'Tickets') iconName = 'ticket';
      else if (route.name === 'Bookings') iconName = 'calendar';
      else if (route.name === 'Announcements') iconName = 'megaphone';
      return <Ionicons name={iconName} size={size} color={color} />;
    },
    tabBarActiveTintColor: '#3498DB',
  })}>
    <Tab.Screen name="Home" component={StudentDashboard} options={{ headerShown: false }} />
    <Tab.Screen name="Tickets" component={TicketStack} options={{ headerShown: false }} />
    <Tab.Screen name="Bookings" component={BookingStack} options={{ headerShown: false }} />
    <Tab.Screen name="Announcements" component={AnnouncementsScreen} />
  </Tab.Navigator>
);

// --- STAFF NAVIGATOR ---
const StaffTabs = () => (
  <Tab.Navigator screenOptions={({ route }) => ({
    tabBarIcon: ({ color, size }) => {
      let iconName;
      if (route.name === 'Home') iconName = 'home';
      else if (route.name === 'Tickets') iconName = 'list';
      else if (route.name === 'ManageBookings') iconName = 'calendar';
      else if (route.name === 'Announcements') iconName = 'megaphone';
      return <Ionicons name={iconName} size={size} color={color} />;
    },
    tabBarActiveTintColor: '#27AE60',
  })}>
    <Tab.Screen name="Home" component={StaffDashboard} options={{ headerShown: false }} />
    <Tab.Screen name="Tickets" component={TicketStack} options={{ headerShown: false }} />
    <Tab.Screen name="ManageBookings" component={ManageBookingsScreen} options={{ title: 'Bookings' }} />
    <Tab.Screen name="Announcements" component={AnnouncementsScreen} />
  </Tab.Navigator>
);

// --- ADMIN NAVIGATOR ---
const AdminTabs = () => (
  <Tab.Navigator screenOptions={({ route }) => ({
    tabBarIcon: ({ color, size }) => {
      let iconName;
      if (route.name === 'Home') iconName = 'home';
      else if (route.name === 'Tickets') iconName = 'list';
      else if (route.name === 'Analytics') iconName = 'bar-chart';
      else if (route.name === 'Settings') iconName = 'settings';
      return <Ionicons name={iconName} size={size} color={color} />;
    },
    tabBarActiveTintColor: '#2C3E50',
  })}>
    <Tab.Screen name="Home" component={AdminDashboard} options={{ headerShown: false }} />
    <Tab.Screen name="Tickets" component={TicketStack} options={{ headerShown: false }} />
    <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    <Tab.Screen name="Settings" component={AdminDashboard} /> 
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { userToken, userInfo } = useContext(AuthContext);

  return (
    <Stack.Navigator>
      {userToken === null ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </>
      ) : (
        // Main App Stack (Role-Based)
        <>
          {userInfo?.role === 'student' && <Stack.Screen name="StudentMain" component={StudentTabs} options={{ headerShown: false }} />}
          {userInfo?.role === 'staff' && <Stack.Screen name="StaffMain" component={StaffTabs} options={{ headerShown: false }} />}
          {userInfo?.role === 'admin' && <Stack.Screen name="AdminMain" component={AdminTabs} options={{ headerShown: false }} />}
          
          {/* Shared Inner Stack Screens for Staff/Admin */}
          <Stack.Screen name="ManageTimeSlots" component={ManageTimeSlotsScreen} options={{ title: 'Time Slots' }} />
          <Stack.Screen name="CreateAnnouncement" component={CreateAnnouncementScreen} options={{ title: 'New Announcement' }} />
          <Stack.Screen name="ManageDepartments" component={ManageDepartmentsScreen} options={{ title: 'Departments' }} />
          <Stack.Screen name="ManageInquiryTypes" component={ManageInquiryTypesScreen} options={{ title: 'Inquiry Types' }} />
          <Stack.Screen name="ManageSLAPolicies" component={ManageSLAPoliciesScreen} options={{ title: 'SLA Policies' }} />
          <Stack.Screen name="ManageBookings" component={ManageBookingsScreen} options={{ title: 'Bookings' }} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;

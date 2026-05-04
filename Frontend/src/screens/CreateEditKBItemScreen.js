import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  createKBItem,
  getAdminKBCategories,
  getKBItem,
  updateKBItem,
  uploadKBPDF,
} from '../services/knowledgeBaseService';

const emptyForm = {
  title: '',
  description: '',
  type: 'ARTICLE',
  status: 'DRAFT',
  categoryId: '',
  content: '',
  pdfUrl: '',
  isFeatured: false,
  isRecommended: false,
};

const CreateEditKBItemScreen = ({ route, navigation }) => {
  const itemId = route.params?.itemId;
  const isEditing = Boolean(itemId);
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit KB Item' : 'New KB Item' });
    load();
  }, [itemId]);

  const load = async () => {
    try {
      setLoading(true);
      const [categoryData, itemData] = await Promise.all([
        getAdminKBCategories(),
        isEditing ? getKBItem(itemId) : Promise.resolve(null),
      ]);
      const categoryItems = Array.isArray(categoryData) ? categoryData : [];
      setCategories(categoryItems);

      if (itemData) {
        setForm({
          title: itemData.title || '',
          description: itemData.description || '',
          type: itemData.type || 'ARTICLE',
          status: itemData.status || 'DRAFT',
          categoryId: itemData.category?.id || itemData.categoryId || '',
          content: itemData.content || '',
          pdfUrl: itemData.pdfUrl || '',
          isFeatured: Boolean(itemData.isFeatured),
          isRecommended: Boolean(itemData.isRecommended),
        });
      } else {
        setForm((previous) => ({
          ...previous,
          categoryId: categoryItems[0]?.id || categoryItems[0]?._id || '',
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load knowledgebase form data');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      setUploading(true);
      const uploaded = await uploadKBPDF(asset);
      updateField('pdfUrl', uploaded.url || '');
      Alert.alert('Success', 'PDF uploaded successfully');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!form.categoryId) {
      Alert.alert('Error', 'Category is required');
      return;
    }
    if (form.type === 'PDF' && !form.pdfUrl.trim()) {
      Alert.alert('Error', 'Upload a PDF or enter a PDF URL');
      return;
    }

    const payload = {
      ...form,
      content: form.type === 'ARTICLE' ? form.content : '',
      pdfUrl: form.type === 'PDF' ? form.pdfUrl : '',
    };

    setSaving(true);
    try {
      if (isEditing) {
        await updateKBItem(itemId, payload);
      } else {
        await createKBItem(payload);
      }
      Alert.alert('Success', 'Knowledgebase item saved', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ label, value, onPress }) => (
    <TouchableOpacity style={styles.toggleRow} onPress={onPress}>
      <View style={[styles.checkbox, value && styles.checkboxActive]}>
        {value && <Ionicons name="checkmark" size={16} color="#FFF" />}
      </View>
      <Text style={styles.toggleLabel}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#3498DB" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title *</Text>
      <TextInput style={styles.input} value={form.title} onChangeText={(value) => updateField('title', value)} placeholder="Knowledgebase item title" />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textAreaSmall]}
        value={form.description}
        onChangeText={(value) => updateField('description', value)}
        placeholder="Short summary"
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.label}>Category *</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={form.categoryId} onValueChange={(value) => updateField('categoryId', value)}>
          {categories.map((category) => (
            <Picker.Item key={category.id || category._id} label={category.name} value={category.id || category._id} />
          ))}
        </Picker>
      </View>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={form.type} onValueChange={(value) => updateField('type', value)}>
              <Picker.Item label="Article" value="ARTICLE" />
              <Picker.Item label="PDF" value="PDF" />
            </Picker>
          </View>
        </View>
        <View style={styles.flex}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={form.status} onValueChange={(value) => updateField('status', value)}>
              <Picker.Item label="Draft" value="DRAFT" />
              <Picker.Item label="Published" value="PUBLISHED" />
              <Picker.Item label="Archived" value="ARCHIVED" />
            </Picker>
          </View>
        </View>
      </View>

      {form.type === 'ARTICLE' ? (
        <>
          <Text style={styles.label}>Article Content</Text>
          <TextInput
            style={[styles.input, styles.textAreaLarge]}
            value={form.content}
            onChangeText={(value) => updateField('content', value)}
            placeholder="Write the article content here"
            multiline
            textAlignVertical="top"
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>PDF *</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickPdf} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#FFF" /> : <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />}
            <Text style={styles.uploadText}>{uploading ? 'Uploading...' : 'Upload PDF'}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={form.pdfUrl}
            onChangeText={(value) => updateField('pdfUrl', value)}
            placeholder="PDF URL"
            autoCapitalize="none"
          />
        </>
      )}

      <View style={styles.toggleBox}>
        <Toggle label="Featured" value={form.isFeatured} onPress={() => updateField('isFeatured', !form.isFeatured)} />
        <Toggle label="Recommended" value={form.isRecommended} onPress={() => updateField('isRecommended', !form.isRecommended)} />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving || uploading}>
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save Item</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 20, paddingBottom: 50 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#34495E', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E6ED',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    marginBottom: 8,
  },
  textAreaSmall: { minHeight: 82, paddingTop: 12 },
  textAreaLarge: { minHeight: 180, paddingTop: 12 },
  pickerContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E6ED',
    borderRadius: 8,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  uploadButton: {
    backgroundColor: '#3498DB',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  uploadText: { color: '#FFF', fontWeight: 'bold' },
  toggleBox: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginTop: 10, gap: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BDC3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxActive: { backgroundColor: '#3498DB', borderColor: '#3498DB' },
  toggleLabel: { color: '#2C3E50', fontWeight: '600' },
  saveButton: { backgroundColor: '#27AE60', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 22 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default CreateEditKBItemScreen;

import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendKBChatMessage } from '../services/knowledgeBaseService';

const FALLBACK_MESSAGE = "Sorry, I can't help you with that. Please refer the knowledgebase for more information.";

const AskAIButton = ({ navigation }) => {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const openSource = (source) => {
    setVisible(false);
    if (source.type === 'FAQ') {
      navigation.navigate('StudentMain', {
        screen: 'Knowledgebase',
        params: { screen: 'KnowledgeBaseFAQs', params: { faqId: source.id } },
      });
      return;
    }
    navigation.navigate('StudentMain', {
      screen: 'Knowledgebase',
      params: { screen: 'KnowledgeBaseItem', params: { itemId: source.id } },
    });
  };

  const send = async () => {
    const message = text.trim();
    if (!message || loading) return;

    const userMessage = { id: `${Date.now()}-user`, role: 'user', text: message };
    setMessages((previous) => [...previous, userMessage]);
    setText('');
    setLoading(true);

    try {
      const response = await sendKBChatMessage(message);
      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: response.response || FALLBACK_MESSAGE,
          sources: response.sources || [],
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        { id: `${Date.now()}-assistant`, role: 'assistant', text: FALLBACK_MESSAGE, sources: [] },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageWrap, isUser && styles.messageWrapUser]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.bubbleText, isUser && styles.userText]}>{item.text}</Text>
        </View>
        {!isUser && item.sources?.length > 0 && (
          <View style={styles.sources}>
            <Text style={styles.sourcesTitle}>Sources</Text>
            {item.sources.map((source) => (
              <TouchableOpacity key={`${source.type}-${source.id}`} style={styles.sourceLink} onPress={() => openSource(source)}>
                <Text style={styles.sourceText} numberOfLines={1}>{source.type}: {source.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity style={styles.floatingButton} onPress={() => setVisible(true)}>
        <Ionicons name="sparkles-outline" size={20} color="#FFF" />
        <Text style={styles.floatingText}>Ask AI</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <View style={styles.panel}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Ask AI</Text>
                <Text style={styles.subtitle}>Answers grounded in the knowledgebase</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
                <Ionicons name="close" size={22} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messages}
              ListEmptyComponent={<Text style={styles.empty}>Ask about portal access, assignments, exams, or support processes.</Text>}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Type your question..."
                multiline
              />
              <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={loading || !text.trim()}>
                {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="send" size={19} color="#FFF" />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 84,
    backgroundColor: '#2C3E50',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  floatingText: { color: '#FFF', fontWeight: 'bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  panel: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '78%', minHeight: '58%' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E6ED', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#2C3E50', fontWeight: 'bold', fontSize: 18 },
  subtitle: { color: '#7F8C8D', fontSize: 12, marginTop: 2 },
  closeBtn: { backgroundColor: '#F5F7FA', borderRadius: 16, padding: 6 },
  messages: { padding: 16, paddingBottom: 8 },
  empty: { color: '#7F8C8D', textAlign: 'center', marginTop: 28, lineHeight: 20 },
  messageWrap: { marginBottom: 12, alignItems: 'flex-start' },
  messageWrapUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '86%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10 },
  userBubble: { backgroundColor: '#3498DB', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#F5F7FA', borderBottomLeftRadius: 4 },
  bubbleText: { color: '#2C3E50', lineHeight: 20 },
  userText: { color: '#FFF' },
  sources: { marginTop: 6, maxWidth: '88%' },
  sourcesTitle: { fontSize: 11, color: '#7F8C8D', fontWeight: 'bold', marginBottom: 4 },
  sourceLink: { backgroundColor: '#EBF5FB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 4 },
  sourceText: { color: '#3498DB', fontSize: 12, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#E0E6ED', gap: 8 },
  input: { flex: 1, backgroundColor: '#F5F7FA', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, maxHeight: 96 },
  sendBtn: { backgroundColor: '#3498DB', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
});

export default AskAIButton;

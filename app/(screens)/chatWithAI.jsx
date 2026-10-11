import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { askHuggingFace } from '../../api/huggingface';

export default function ChatWithAI() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResponse('...');
    const answer = await askHuggingFace(input);
    setResponse(answer);
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        placeholder="Unesi pitanje"
        value={input}
        onChangeText={setInput}
        style={styles.input}
        multiline
      />
      <Button
        title={loading ? 'Čekam odgovor...' : 'Pošalji'}
        onPress={handleAsk}
        disabled={loading}
      />
      <Text style={styles.response}>{response}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    minHeight: 60,
  },
  response: {
    marginTop: 16,
    fontSize: 16,
    fontStyle: 'italic',
  },
});

import axios from 'axios';
import { HF_TOKEN } from '@env';

export const askHuggingFace = async (userMessage) => {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
      {
        inputs: `<s>[INST] ${userMessage} [/INST]`,
      },
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const generated = response.data?.[0]?.generated_text;
    return generated || 'Nema odgovora.';
  } catch (error) {
    console.error(
      'Greška kod HF API-ja:',
      error.response?.data || error.message
    );
    return 'Greška prilikom dohvaćanja odgovora.';
  }
};

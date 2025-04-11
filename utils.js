import axios from 'axios';
import FormData from 'form-data';

export async function downloadImage(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data, 'binary');
}

export async function analyzeImage(imageBuffer) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) throw new Error('GEMINI_API_KEY missing');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;

  const base64Image = imageBuffer.toString('base64');

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `You are an expert trader. Analyze the chart image and return:
Prediction: [UP/DOWN/DO NOT TRADE], Confidence: [0-100]%, Duration: [number] minutes, Recommendation: [APROVED TRAD/DO NOT TRADE/AVOID THIS SETUP], Optimal Execution Timing: [Description]`
          },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Image
            }
          }
        ]
      }
    ]
  };

  const res = await axios.post(endpoint, requestBody);

  const output = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!output) return null;

  const parts = output.split(',').map(p => p.split(':')[1]?.trim());
  if (parts.length < 5) return null;

  return {
    prediction: parts[0],
    confidence: parts[1],
    duration: parts[2],
    recommendation: parts[3],
    execution_timing: parts[4]
  };
}

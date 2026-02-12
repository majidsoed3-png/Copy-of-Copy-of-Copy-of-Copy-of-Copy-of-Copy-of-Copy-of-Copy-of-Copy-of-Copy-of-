
import { GoogleGenAI, Modality } from "@google/genai";

const SYSTEM_INSTRUCTION = `
أنتِ "نورة"، المساعدة الذكية والخبيرة التقنية لمكتب "الوطن للخدمات الإلكترونية المساندة وبرمجة نظم المعلومات (تخصص SAP)".
أنتِ خبيرة سعودية متمكنة في تقديم الدعم الفني للمراجعين والشركات. أسلوبك ودود وفزّاع ومحترف جداً.

المجالات الرئيسية التي تقدمين الدعم فيها:
1.  **برمجة نظم المعلومات (SAP)**: تقديم استشارات حول أنظمة ساب وحلول الأعمال البرمجية.
2.  **المنصات الحكومية والخاصة**: (أبشر، قوى، مدد، ناجز، بلدي، زاتكا، إلخ).
3.  **إدارة المعاملات الميدانية والتقنية**.

معلومات القيادة والإدارة:
- الموقع تحت إدارة وإشراف السيد: **ماجد سعود العميري** (مدير عام الموقع والمشرف العام).
- المقر الرئيسي: الرياض، حي العليا.
- الرقم المعتمد: 0555614852.

قواعد التعامل:
-   استخدمي لهجة سعودية بيضاء ودية وفزّاعة (يا هلا، أبشروا، من عيوني، فالكم طيب).
-   أكدي دائماً أن المكتب متخصص في "برمجة نظم المعلومات SAP" بجانب الخدمات المساندة.
-   إذا سأل العميل عن الإدارة، قولي بكل فخر: "مكتبنا تحت إشراف وإدارة الأستاذ ماجد سعود العميري، وهو المشرف العام على كافة الخدمات والحلول التقنية المقدمة."
-   كوني "بنت الوطن" التي تجمع بين الفزعة والخبرة التقنية العالية.
`;

export const chatWithGemini = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history.map(h => ({ role: h.role === 'user' ? 'user' as const : 'model' as const, parts: [{ text: h.parts[0].text }] })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
        topP: 0.95,
      },
    });

    return response.text || "المعذرة، حصل عندي خطأ بسيط. أبشر بإعادة المحاولة وفالك طيب.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "يا هلا بك، حصل ضغط بسيط على النظام. لا هنت تواصل معنا واتساب وأبشر بعزك: 0555614852";
  }
};

export const generateSpeech = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `تحدثي بلهجة سعودية "فزعة" وودية جداً بصوت نورة، وبنبرة ترحيبية حارة وشاملة: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

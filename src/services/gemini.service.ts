import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { environment } from '../environments/environment';

export interface GroundingChunk {
  web: {
    uri: string;
    title: string;
  };
}

export interface GeminiResponse {
  text: string;
  sources: GroundingChunk[];
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private genAI: GoogleGenAI | null = null;
  
  constructor() {
    // IMPORTANT: The API_KEY is expected to be available in the environment.
    // Do not ask the user for it.
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey });
    } else {
      console.error('API_KEY environment variable not set.');
    }
  }

  async getDietInfo(query: string): Promise<GeminiResponse> {
    if (!this.genAI) {
      throw new Error('Gemini AI client is not initialized. Check API Key.');
    }

    const model = 'gemini-2.5-flash';
    const finalQuery = `بصفتك خبير تغذية موثوق، قدم شرحًا مفصلاً ومقارنة حول: "${query}". عند صياغة إجابتك، يجب أن تستند بشكل أساسي إلى أحدث الإرشادات والتوصيات من منظمات صحية دولية معتمدة مثل الجمعية الأمريكية للسكري (American Diabetes Association)، وجمعية القلب الأمريكية (American Heart Association)، وهيئة الغذاء والدواء الأمريكية (FDA). وضح الفوائد، المخاطر، والأطعمة المسموحة والممنوعة لكل نظام مذكور. استخدم لغة عربية واضحة ومناسبة لغير المتخصصين.`;

    try {
      const response = await this.genAI.models.generateContent({
        model: model,
        contents: finalQuery,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text;
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      const sources: GroundingChunk[] = groundingMetadata?.groundingChunks || [];

      return { text, sources };
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Failed to fetch information from Gemini API.');
    }
  }

  async analyzeSymptoms(symptoms: string): Promise<any> {
     if (!this.genAI) {
      throw new Error('Gemini AI client is not initialized. Check API Key.');
    }
    const model = 'gemini-2.5-flash';
    const prompt = `بصفتك خبير تغذية متخصص، حلل الأعراض التالية: "${symptoms}". بناءً على هذه الأعراض والأدبيات العلمية الموثوقة، حدد أبرز 3 نقص محتمل في الفيتامينات أو المعادن. لكل نقص محتمل، قدم شرحًا مبسطًا، وقائمة بالأطعمة الغنية به، والجرعة اليومية الموصى بها (RDA) للبالغين وفقًا للمعاهد الوطنية للصحة (NIH) أو ما يعادلها. أضف تحذيرًا واضحًا في النهاية بضرورة استشارة الطبيب قبل تناول أي مكملات. يجب أن يكون الرد بصيغة JSON.`;

    try {
       const response = await this.genAI.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              potentialDeficiencies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'اسم الفيتامين أو المعدن' },
                    explanation: { type: Type.STRING, description: 'شرح مبسط عن سبب ارتباطه بالأعراض' },
                    foodSources: { type: Type.ARRAY, items: { type: Type.STRING } },
                    recommendedDosage: { type: Type.STRING, description: 'الجرعة اليومية الموصى بها للبالغين' }
                  }
                }
              },
               disclaimer: { type: Type.STRING, description: 'تحذير هام بضرورة استشارة الطبيب' },
            }
          },
        },
      });

      const jsonStr = response.text.trim();
      return JSON.parse(jsonStr);

    } catch (error) {
      console.error('Error analyzing symptoms with Gemini:', error);
      throw new Error('Failed to analyze symptoms.');
    }
  }

  async getRelatedDietTopics(topic: string): Promise<string[]> {
    if (!this.genAI) {
      throw new Error('Gemini AI client is not initialized. Check API Key.');
    }
    const model = 'gemini-2.5-flash';
    const prompt = `بناءً على موضوع التغذية التالي: "${topic}"، قم بإنشاء قائمة من 5 أسئلة ذات صلة أو مواضيع للمقارنة قد يهتم بها المستخدم أيضًا. يجب أن يكون الرد بصيغة JSON.`;

    try {
      const response = await this.genAI.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              related_topics: {
                type: Type.ARRAY,
                description: 'A list of 5 related diet questions or topics.',
                items: {
                  type: Type.STRING
                }
              }
            },
            required: ['related_topics']
          },
        },
      });

      const jsonStr = response.text.trim();
      const parsed = JSON.parse(jsonStr);
      return parsed.related_topics || [];

    } catch (error) {
      console.error('Error fetching related topics from Gemini:', error);
      // Return an empty array on failure to not break the UI
      return [];
    }
  }

  async generateMealPlan(calories: number, dietType: string, goal: string, allergies: string[]): Promise<any> {
    if (!this.genAI) {
      throw new Error('Gemini AI client is not initialized. Check API Key.');
    }
    const model = 'gemini-2.5-flash';
    const allergyText = allergies.length > 0 ? `يجب تجنب الأطعمة المسببة للحساسية التالية: ${allergies.join(', ')}.` : '';
    const prompt = `بصفتك أخصائي تغذية محترف، قم بإنشاء خطة وجبات صحية ومتوازنة ليوم واحد بناءً على المعايير التالية: السعرات الحرارية المستهدفة: ${calories} سعر حراري، نوع النظام الغذائي: "${dietType}", الهدف: "${goal}". ${allergyText} قسم الخطة إلى 4 وجبات: فطور، غداء، عشاء، ووجبة خفيفة. لكل وجبة، اذكر اسم الوجبة، واسم الطبق، ومكوناته، وعدد السعرات الحرارية التقريبي. يجب أن يكون مجموع السعرات قريبًا جدًا من الهدف. يجب أن يكون الرد بصيغة JSON.`;
    
    try {
      const response = await this.genAI.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              totalCalories: { type: Type.NUMBER },
              meals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'اسم الوجبة (فطور، غداء، عشاء، وجبة خفيفة)' },
                    dish: { type: Type.STRING, description: 'اسم الطبق' },
                    calories: { type: Type.NUMBER },
                    ingredients: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['name', 'dish', 'calories', 'ingredients']
                }
              }
            },
            required: ['totalCalories', 'meals']
          },
        },
      });
      const jsonStr = response.text.trim();
      return JSON.parse(jsonStr);
    } catch (error) {
       console.error('Error generating meal plan with Gemini:', error);
       throw new Error('Failed to generate meal plan.');
    }
  }
}
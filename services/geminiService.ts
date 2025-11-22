
import { AnalysisResult } from "../types";
import { SYSTEM_PROMPT } from "../constants";

export const analyzeEmotion = async (text: string, apiKey: string): Promise<AnalysisResult> => {
  if (!apiKey) {
    throw new Error("API Key 未配置");
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { 
              role: "system", 
              content: SYSTEM_PROMPT + `\n\n【IMPORTANT】You MUST output valid JSON only. No markdown code blocks, no introductory text, no explanations. The JSON must match this schema exactly:
              {
                "summary": "string (max 30 chars)",
                "scores": { "calmness": number, "awareness": number, "energy": number },
                "focus_analysis": { "time_orientation": "Past"|"Present"|"Future", "focus_target": "Internal"|"External" },
                "nvc_guide": { "observation": "string", "feeling": "string", "need": "string", "empathy_response": "string" },
                "key_insights": ["string", "string"],
                "recommendations": { "holistic_advice": "string" }
              }`
          },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" },
        temperature: 1.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      let errorMsg = `DeepSeek API Error (${response.status})`;
      try {
          const errorData = await response.json();
          if (errorData?.error?.message) {
            errorMsg = `DeepSeek 错误: ${errorData.error.message}`;
          }
      } catch (e) {
          // Ignore json parse error on error response
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI 返回内容为空");
    }

    // Robust cleaning: remove markdown code blocks and whitespace
    const cleanContent = content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

    return JSON.parse(cleanContent) as AnalysisResult;

  } catch (e: any) {
    console.error("Analysis Error:", e);
    if (e.message.includes("JSON")) {
        throw new Error("AI 返回格式异常，请重试");
    }
    throw e;
  }
};

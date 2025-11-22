export interface Scores {
  calmness: number; // 平静度
  awareness: number; // 觉察度
  energy: number; // 能量水平
}

export type TimeOrientation = 'Past' | 'Present' | 'Future';
export type FocusTarget = 'Internal' | 'External';

export interface FocusAnalysis {
  time_orientation: TimeOrientation;
  focus_target: FocusTarget;
}

export interface NVCGuide {
  observation: string;
  feeling: string;
  need: string;
  empathy_response: string;
}

export interface AnalysisResult {
  summary: string;
  scores: Scores;
  focus_analysis: FocusAnalysis;
  nvc_guide: NVCGuide;
  key_insights: string[];
  recommendations: {
    holistic_advice: string;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string; // ISO string
  user_input: string;
  ai_result: AnalysisResult;
}

export interface TestAccount {
  id: string;
  username: string;
  password: string;
  created_at: string;
  expires_at: string; // ISO string
  daily_limit: number; // 每日使用次数限制
  daily_usage: { [date: string]: number }; // 格式: { "2024-01-01": 5 }
  total_usage: number; // 总使用次数
  is_active: boolean;
}

export interface AccountUsage {
  account_id: string;
  date: string; // YYYY-MM-DD
  count: number;
}

import { createClient } from '@supabase/supabase-js';
import { LogEntry } from '../types';
import { DB_TABLE_NAME } from '../constants';

// Helper to create a dynamic client based on user input
const getClient = (url: string, key: string) => {
    if (!url || !key) return null;
    return createClient(url, key);
};

// Fetch recent logs
export const fetchLogs = async (url: string, key: string) => {
    const supabase = getClient(url, key);
    if (!supabase) throw new Error("Missing Supabase credentials");

    const { data, error } = await supabase
        .from(DB_TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Supabase Fetch Error:", error);
        throw error;
    }

    // Map DB structure to App structure if necessary
    // Assuming DB has: id, created_at, user_input, ai_result (jsonb)
    return data.map((row: any) => ({
        id: row.id,
        timestamp: row.created_at, // Ensure your Python DB used 'created_at'
        user_input: row.user_input,
        ai_result: row.ai_result
    })) as LogEntry[];
};

// Insert a new log
// Updated to accept timestamp and user_id explicitly
export const saveLog = async (url: string, key: string, entry: Omit<LogEntry, 'id'> & { user_id?: string }) => {
    const supabase = getClient(url, key);
    if (!supabase) throw new Error("Missing Supabase credentials");

    // Validate required fields
    if (!entry.timestamp) {
        throw new Error("时间戳不能为空");
    }
    if (!entry.user_input) {
        throw new Error("用户输入不能为空");
    }
    if (!entry.ai_result) {
        throw new Error("AI 分析结果不能为空");
    }

    // Validate timestamp format - ensure it's a valid ISO 8601 string
    try {
        const timestampDate = new Date(entry.timestamp);
        if (isNaN(timestampDate.getTime())) {
            throw new Error("时间戳格式无效");
        }
    } catch (e) {
        throw new Error("时间戳格式验证失败: " + (e as Error).message);
    }

    // Log the data being saved for debugging
    console.log('💾 准备保存到数据库:', {
        timestamp: entry.timestamp,
        user_input_length: entry.user_input?.length,
        has_ai_result: !!entry.ai_result,
        timestamp_valid: !isNaN(new Date(entry.timestamp).getTime())
    });

    const insertData = {
        user_input: entry.user_input,
        ai_result: entry.ai_result,
        // Explicitly set timestamp from client to avoid server timezone mismatches
        // Supabase accepts ISO 8601 format strings (e.g., "2024-01-01T12:00:00.000+08:00")
        created_at: entry.timestamp, 
        // Set user_id (default to guest_001 to match existing data)
        user_id: entry.user_id || 'guest_001'
    };

    console.log('📤 发送到数据库的数据:', {
        ...insertData,
        ai_result_keys: Object.keys(insertData.ai_result || {})
    });

    const { data, error } = await supabase
        .from(DB_TABLE_NAME)
        .insert([insertData])
        .select()
        .single();

    if (error) {
        console.error("❌ Supabase Insert Error:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        throw new Error(`数据库保存失败: ${error.message}${error.details ? ' - ' + error.details : ''}`);
    }

    if (!data) {
        throw new Error("数据库返回数据为空");
    }

    console.log('✅ 数据已成功保存到数据库:', {
        id: data.id,
        created_at: data.created_at,
        timestamp_match: data.created_at === entry.timestamp
    });

    return {
        id: data.id,
        timestamp: data.created_at,
        user_input: data.user_input,
        ai_result: data.ai_result
    } as LogEntry;
};

// Delete a log
export const deleteLog = async (url: string, key: string, id: string) => {
    const supabase = getClient(url, key);
    if (!supabase) throw new Error("Missing Supabase credentials");

    const { error } = await supabase
        .from(DB_TABLE_NAME)
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Supabase Delete Error:", error);
        throw error;
    }
};

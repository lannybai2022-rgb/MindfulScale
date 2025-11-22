import { createClient } from '@supabase/supabase-js';
import { TestAccount, AccountUsage } from '../types';
import { ACCOUNTS_TABLE_NAME, USAGE_TABLE_NAME, DAILY_LIMIT, ACCOUNT_VALIDITY_DAYS } from '../constants';

// Helper to create a dynamic client
const getClient = (url: string, key: string) => {
    if (!url || !key) return null;
    return createClient(url, key);
};

// Get today's date string (YYYY-MM-DD)
const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

// Login: Verify username and password
export const login = async (url: string, key: string, username: string, password: string): Promise<TestAccount> => {
    const supabase = getClient(url, key);
    if (!supabase) throw new Error("Missing Supabase credentials");

    const { data, error } = await supabase
        .from(ACCOUNTS_TABLE_NAME)
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('is_active', true)
        .single();

    if (error || !data) {
        throw new Error("用户名或密码错误");
    }

    // Check if account is expired
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    if (expiresAt < now) {
        throw new Error("账号已过期");
    }

    return data as TestAccount;
};

// Check if user can submit (daily limit and account validity)
export const checkCanSubmit = async (url: string, key: string, accountId: string): Promise<{ canSubmit: boolean; reason?: string; remaining?: number }> => {
    const supabase = getClient(url, key);
    if (!supabase) throw new Error("Missing Supabase credentials");

    // Get account info
    const { data: account, error: accountError } = await supabase
        .from(ACCOUNTS_TABLE_NAME)
        .select('*')
        .eq('id', accountId)
        .single();

    if (accountError || !account) {
        return { canSubmit: false, reason: "账号不存在" };
    }

    // Check expiration
    const expiresAt = new Date(account.expires_at);
    const now = new Date();
    if (expiresAt < now) {
        return { canSubmit: false, reason: "账号已过期" };
    }

    // Check daily limit
    const today = getTodayString();
    const { data: usageData, error: usageError } = await supabase
        .from(USAGE_TABLE_NAME)
        .select('count')
        .eq('account_id', accountId)
        .eq('date', today)
        .single();

    const todayUsage = usageData?.count || 0;
    const remaining = DAILY_LIMIT - todayUsage;

    if (todayUsage >= DAILY_LIMIT) {
        return { canSubmit: false, reason: `今日使用次数已达上限（${DAILY_LIMIT}次）`, remaining: 0 };
    }

    return { canSubmit: true, remaining };
};

// Record usage (increment count)
export const recordUsage = async (url: string, key: string, accountId: string): Promise<void> => {
    const supabase = getClient(url, key);
    if (!supabase) throw new Error("Missing Supabase credentials");

    const today = getTodayString();

    // Check if record exists for today
    const { data: existing } = await supabase
        .from(USAGE_TABLE_NAME)
        .select('*')
        .eq('account_id', accountId)
        .eq('date', today)
        .single();

    if (existing) {
        // Update existing record
        const { error } = await supabase
            .from(USAGE_TABLE_NAME)
            .update({ count: existing.count + 1 })
            .eq('id', existing.id);

        if (error) throw error;
    } else {
        // Create new record
        const { error } = await supabase
            .from(USAGE_TABLE_NAME)
            .insert([{
                account_id: accountId,
                date: today,
                count: 1
            }]);

        if (error) throw error;
    }

    // Update total_usage in account
    const { data: account } = await supabase
        .from(ACCOUNTS_TABLE_NAME)
        .select('total_usage')
        .eq('id', accountId)
        .single();

    if (account) {
        await supabase
            .from(ACCOUNTS_TABLE_NAME)
            .update({ total_usage: (account.total_usage || 0) + 1 })
            .eq('id', accountId);
    }
};

// Get account info
export const getAccountInfo = async (url: string, key: string, accountId: string): Promise<TestAccount & { todayUsage: number; remaining: number }> => {
    const supabase = getClient(url, key);
    if (!supabase) throw new Error("Missing Supabase credentials");

    const { data: account, error } = await supabase
        .from(ACCOUNTS_TABLE_NAME)
        .select('*')
        .eq('id', accountId)
        .single();

    if (error || !account) {
        throw new Error("获取账号信息失败");
    }

    const today = getTodayString();
    const { data: usageData } = await supabase
        .from(USAGE_TABLE_NAME)
        .select('count')
        .eq('account_id', accountId)
        .eq('date', today)
        .single();

    const todayUsage = usageData?.count || 0;
    const remaining = DAILY_LIMIT - todayUsage;

    return {
        ...(account as TestAccount),
        todayUsage,
        remaining
    };
};

// Generate 10 test accounts (for admin use)
export const generateTestAccounts = async (url: string, key: string): Promise<TestAccount[]> => {
    const supabase = getClient(url, key);
    if (!supabase) throw new Error("Missing Supabase credentials");

    const accounts: Omit<TestAccount, 'id'>[] = [];
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + ACCOUNT_VALIDITY_DAYS);

    for (let i = 1; i <= 10; i++) {
        accounts.push({
            username: `test${i.toString().padStart(2, '0')}`,
            password: `pass${i.toString().padStart(2, '0')}`,
            created_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            daily_limit: DAILY_LIMIT,
            daily_usage: {},
            total_usage: 0,
            is_active: true
        });
    }

    const { data, error } = await supabase
        .from(ACCOUNTS_TABLE_NAME)
        .insert(accounts)
        .select();

    if (error) {
        throw new Error(`生成测试账号失败: ${error.message}`);
    }

    return data as TestAccount[];
};


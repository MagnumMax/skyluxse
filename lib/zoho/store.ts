import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as ZOHOCRMSDK from "@zohocrm/nodejs-sdk-7.0";

// SDK ships without TypeScript types; treat Zoho objects as any to avoid blocking compilation.
const Zoho: any = ZOHOCRMSDK;

export class SupabaseTokenStore extends Zoho.TokenStore.TokenStore {
    private supabase: SupabaseClient;

    constructor() {
        super();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Supabase configuration missing");
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    async getToken(user: any, token: any): Promise<any | undefined> {
        try {
            const { data, error } = await this.supabase
                .from("zoho_tokens")
                .select("*")
                .eq("user_mail", user.getEmail())
                .single();

            if (error || !data) {
                return undefined;
            }

            if (token instanceof Zoho.OAuthToken) {
                token.setAccessToken(data.access_token);
                token.setRefreshToken(data.refresh_token);
                token.setExpiresIn(data.expiry_time);
                token.setId(data.id.toString());
                return token;
            }
        } catch (e) {
            console.error("Error fetching Zoho token from Supabase:", e);
        }
        return undefined;
    }

    async saveToken(user: any, token: any): Promise<void> {
        try {
            if (token instanceof Zoho.OAuthToken) {
                const tokenData = {
                    user_mail: user.getEmail(),
                    client_id: token.getClientId(),
                    refresh_token: token.getRefreshToken(),
                    access_token: token.getAccessToken(),
                    grant_token: token.getGrantToken(),
                    expiry_time: token.getExpiresIn(),
                };

                // Check if token exists
                const { data: existing } = await this.supabase
                    .from("zoho_tokens")
                    .select("id")
                    .eq("user_mail", user.getEmail())
                    .single();

                if (existing) {
                    await this.supabase
                        .from("zoho_tokens")
                        .update(tokenData)
                        .eq("id", existing.id);
                } else {
                    await this.supabase
                        .from("zoho_tokens")
                        .insert(tokenData);
                }
            }
        } catch (e) {
            console.error("Error saving Zoho token to Supabase:", e);
            throw e;
        }
    }

    async deleteToken(token: any): Promise<void> {
        try {
            if (token instanceof Zoho.OAuthToken) {
                await this.supabase
                    .from("zoho_tokens")
                    .delete()
                    .eq("user_mail", token.getUserSignature().getEmail());
            }
        } catch (e) {
            console.error("Error deleting Zoho token from Supabase:", e);
            throw e;
        }
    }

    async getTokens(tokens: ZOHOCRMSDK.Token[]): Promise<ZOHOCRMSDK.Token[]> {
        // Not implemented for now, as we usually deal with single user context
        return [];
    }

    async deleteTokens(tokens: any[]): Promise<void> {
        // Not implemented
    }

    async findToken(token: any): Promise<any | undefined> {
        // Not implemented
        return undefined;
    }

    async findTokens(tokens: any[]): Promise<any[]> {
        // Not implemented
        return [];
    }
}

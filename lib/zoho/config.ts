import * as ZOHOCRMSDK from "@zohocrm/nodejs-sdk-7.0";
import { SupabaseTokenStore } from "./store";

export const initializeZoho = async () => {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const redirectURL = "https://www.google.com"; // Not used for server-side operations but required
    const userEmail = process.env.ZOHO_USER_EMAIL;
    const environment = ZOHOCRMSDK.USDataCenter.PRODUCTION(); // Or EUDataCenter based on domain

    if (!clientId || !clientSecret || !userEmail) {
        throw new Error("Zoho configuration missing in environment variables");
    }

    const user = new ZOHOCRMSDK.UserSignature(userEmail);
    const tokenStore = new SupabaseTokenStore();

    // Configure Logger
    const logger = new ZOHOCRMSDK.LogBuilder()
        .level(ZOHOCRMSDK.Levels.INFO)
        .filePath("./zoho_sdk_log.log")
        .build();

    // Configure Token
    // Note: For initial setup, you might need to generate a grant token manually if not using refresh token flow directly
    // Ideally, we start with a refresh token in the DB or env
    const token = new ZOHOCRMSDK.OAuthBuilder()
        .clientId(clientId)
        .clientSecret(clientSecret)
        .refreshToken(process.env.ZOHO_REFRESH_TOKEN)
        .redirectURL(redirectURL)
        .build();

    // Initialize SDK
    const builder = await new ZOHOCRMSDK.InitializeBuilder();
    await builder
        .environment(environment)
        .token(token)
        .store(tokenStore)
        .logger(logger)
        .initialize();

    return user;
};

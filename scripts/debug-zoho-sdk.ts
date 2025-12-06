// @ts-ignore
import * as SDK from "@zohocrm/nodejs-sdk-7.0/lib/zohocrmsdk.js";

console.log("SDK keys:", Object.keys(SDK));
try {
    console.log("SDK.TokenStore:", (SDK as any).TokenStore);
} catch (e) {
    console.error(e);
}

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("./database/mongodb");
const appModule = __importStar(require("./app"));
const app = appModule.default || appModule;
const config_1 = require("./config");
const job_service_1 = require("./services/job.service");
const jobService = new job_service_1.JobService();
function startExpiredJobCloser() {
    jobService.closeExpiredJobs().catch((error) => {
        console.error("Failed to close expired jobs", error);
    });
    const interval = setInterval(() => {
        jobService.closeExpiredJobs().catch((error) => {
            console.error("Failed to close expired jobs", error);
        });
    }, 60 * 60 * 1000);
    interval.unref();
}
async function startServer() {
    await (0, mongodb_1.connectDB)();
    startExpiredJobCloser();
    app.listen(config_1.PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${config_1.PORT}`);
    });
}
startServer();

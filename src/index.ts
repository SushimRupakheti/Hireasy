import { connectDB } from "./database/mongodb";
import * as appModule from "./app";
const app: any = (appModule as any).default || appModule;
import { PORT } from './config';
import { JobService } from "./services/job.service";

const jobService = new JobService();

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
    await connectDB();
    startExpiredJobCloser();
    app.listen(
        PORT,
        "0.0.0.0",
        () => {
            console.log(`Server running on port ${PORT}`);
        }
    );

}

startServer();

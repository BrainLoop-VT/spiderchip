import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import dotenv from "dotenv";
import { NotFoundError } from "./errors";
import { errorHandler } from "./middleware/errorHandler";
import levelRoutes from './routes/levelRoutes';

dotenv.config();

const app = express();

// Middleware must come before routes
app.use(express.json());
app.use(cors());
app.use(helmet());

app.use((req, res, next) => {
    console.log('=== Request Details ===');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    console.log('====================');
    next();
});

// Mount routes
app.use("/api", routes);

// Error handling
app.all("*", (req, res, next) => {  // Fixed parameter order
    return next(new NotFoundError());
});

app.use(errorHandler as express.ErrorRequestHandler);

export default app;

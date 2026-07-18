// Vercel serverless entry point.
// Re-exports the Express app so Vercel can use it as a request handler.
import app from '../src/index';

export default app;

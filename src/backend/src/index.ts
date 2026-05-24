import express from "express";
import cors from "cors";
import helmet from "helmet";
import { querySecurityMiddleware } from "./middleware/queryNormalizer";
import authRoutes from "./routes/AuthRoute";
import employeeRoutes from "./routes/EmployeeRoute";
import laborEventsRoutes from "./routes/LaborEventsRoute";
import deductionsRoutes from "./routes/DeductionsRoute";
import employeeDeductionsRoutes from "./routes/EmployeeDeductionsRoute";
import payrollTypeRoutes from "./routes/PayrollTypeRoute";
import payrollRoutes from "./routes/PayrollRoutes";
import reportsRoutes from "./routes/ReportsRoute";
import clockLogsRoutes from "./routes/ClockLogsRoute";
import clockAliasRoutes from "./routes/ClockAliasRoute";
import bonusesRoutes from "./routes/BonusesRoute";
import nomineeRoutes from "./routes/NomineeRoute";
import positionRoutes from "./routes/PositionRoute";
import vacationRoutes from "./routes/VacationRoute";
import auditLogsRoutes from "./routes/AuditLogsRoute";
import userRoutes from "./routes/UserRoute";
import paymentReceiptRoutes from "./routes/PaymentReceiptRoute";
import { notificationRouter } from "./routes/NotificationRoute";
import emailRoutes from "./routes/EmailRoute";
import companyHolidayRoutes from "./routes/companyHolidayRoutes";
import timeWindowRoutes from "./routes/TimeWindowRoute";
import dayConfirmationRoutes from "./routes/DayConfirmationRoute";
import markSuggestionRoutes from "./routes/MarkSuggestionRoute";
import legalParamRoutes from "./routes/LegalParamRoute";
import enterpriseRoutes from "./routes/EnterpriseRoute";
import integrityRoutes from "./routes/IntegrityRoute";
import aguinaldoRoutes from "./routes/AguinaldoRoute";
import { swaggerSpec } from "./utils/docs";
import { env } from "./config/env";

const app = express();
const PORT = env.PORT;

// Trust Render's reverse proxy so express-rate-limit reads the real client IP
app.set('trust proxy', 1);

// Health check before any middleware — must be reachable by uptime monitors
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Servidor funcionando correctamente" });
});

// Middlewares básicos
const allowedOrigins = env.ALLOWED_ORIGINS;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isVercel = origin.endsWith('.vercel.app') || origin === 'https://vp-planilla.vercel.app';
    const isAllowed = allowedOrigins.includes(origin);
    if (isVercel || isAllowed) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(helmet());
app.use(express.json());
app.use(querySecurityMiddleware);

console.log("Servidor en ejecución...");

// Solo rutas básicas sin importar nada más
app.get("/", (_req, res) => {
  console.log("Ruta raíz accesada");
  res.json({
    success: true,
    message: "API de VP Planillas funcionando 🚀",
  });
});

// Ruta de auth básica sin importaciones externas
app.use("/api", authRoutes);
app.use("/api", employeeRoutes);
app.use("/api", laborEventsRoutes);
app.use("/api", deductionsRoutes);
app.use("/api", employeeDeductionsRoutes);
app.use("/api", payrollTypeRoutes);
app.use("/api", payrollRoutes);
app.use("/api", clockLogsRoutes);
app.use("/api", clockAliasRoutes);
app.use("/api", bonusesRoutes);
app.use("/api", reportsRoutes);
app.use("/api", nomineeRoutes);
app.use("/api", positionRoutes);
app.use("/api", vacationRoutes);
app.use("/api", auditLogsRoutes);
app.use("/api", userRoutes);
app.use("/api/payment-receipts", paymentReceiptRoutes);
app.use("/api/notifications", notificationRouter);
app.use("/api/email", emailRoutes);
app.use("/api/company-holidays", companyHolidayRoutes);
app.use("/api/time-windows", timeWindowRoutes);
app.use("/api/day-confirmations", dayConfirmationRoutes);
app.use("/api/suggestions", markSuggestionRoutes);
app.use("/api", legalParamRoutes);
app.use("/api", enterpriseRoutes);
app.use("/api/integrity", integrityRoutes);
app.use("/api", aguinaldoRoutes);

// Servir la especificación de Swagger en formato JSON
app.get("/api/docs/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

import * as Sentry from "@sentry/node";

// ESM-only package: load dynamically to work under CommonJS runtime
app.use("/api/docs", async (req, res, next) => {
  try {
    const { apiReference } = await import("@scalar/express-api-reference");
    const mw = apiReference({ url: "/api/docs/swagger.json" });
    return (mw as unknown as (req: any, res: any, next: any) => void)(req, res, next);
  } catch (e) {
    console.error("Failed to load API reference UI:", e);
    res.status(500).json({ success: false, message: "Docs UI unavailable" });
  }
});

Sentry.setupExpressErrorHandler(app);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Servidor escuchando en http://0.0.0.0:${PORT}`);
});

export default app;

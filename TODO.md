🔴 Crítico (hacer antes del primer deploy)
   ✅ Transferir repo a organización GitHub
   ✅ Verificar que .env nunca fue commiteado
   ✅ CORS restringido al dominio real
   ☐ Variables de entorno en paneles de Vercel y Render
   ✅ prisma migrate deploy en el script de build (Render start command)

🟡 Importante (primera semana en producción)
   ✅ helmet + rate-limit en Express
   ✅ Manejo de errores sin exponer internos (NODE_ENV=production)
   ✅ JWT con expiración definida
   ☐ UptimeRobot configurado
   ☐ Backup manual inicial de la DB

🟢 Bueno tener (antes de que escale)
   ✅ Sentry para monitoreo de errores
   ✅ Conventional Commits activo
   ☐ Acuerdo escrito con el cliente
   ☐ Cuentas de servicios a nombre del cliente

📌 Decisiones de infraestructura
   ✅ Docker Compose + Dockerfiles (Node 22, pnpm 11)
   ✅ GitHub Actions CI (ci-reusable, ci-develop, ci-main)
   ✅ .gitattributes (line endings LF)
   — Branch protection: omitida (repo privado en org, plan Free no lo soporta)

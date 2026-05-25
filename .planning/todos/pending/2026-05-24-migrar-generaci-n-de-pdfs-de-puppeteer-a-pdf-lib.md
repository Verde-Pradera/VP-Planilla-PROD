---
created: 2026-05-24T21:29:14.013Z
title: Migrar generación de PDFs de Puppeteer a pdf-lib
area: general
files:
  - src/backend/.puppeteerrc.cjs
  - src/backend/package.json
---

## Problem

Puppeteer lanza un browser Chrome completo (~300MB) en el servidor cada vez que se genera un PDF. En Render free tier (512MB RAM) esto puede causar crashes bajo carga. El build tarda más por descargar el binario de Chrome. Aplica a recibos de pago, reportes CCSS y Hacienda.

## Solution

Reemplazar Puppeteer con `pdf-lib` (ya está en las dependencias) para generación programática de PDFs. Los documentos de nómina son estructurados (tablas, texto, números) — no necesitan renderizar HTML complejo. Resultado: sin binario de Chrome, 10x más rápido, menor consumo de RAM.

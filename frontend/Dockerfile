FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
# Variáveis NEXT_PUBLIC_* e BACKEND_URL são incorporadas no build.
ARG BACKEND_URL=http://api:3001
ARG NEXT_PUBLIC_SITE_URL=http://localhost
ARG NEXT_PUBLIC_MP_PUBLIC_KEY=
ARG NEXT_PUBLIC_CONTATO_EMAIL=contato@lumenlivraria.com.br
ARG NEXT_PUBLIC_CONTATO_TELEFONE=
ARG NEXT_PUBLIC_WHATSAPP=
ENV BACKEND_URL=$BACKEND_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_MP_PUBLIC_KEY=$NEXT_PUBLIC_MP_PUBLIC_KEY \
    NEXT_PUBLIC_CONTATO_EMAIL=$NEXT_PUBLIC_CONTATO_EMAIL NEXT_PUBLIC_CONTATO_TELEFONE=$NEXT_PUBLIC_CONTATO_TELEFONE NEXT_PUBLIC_WHATSAPP=$NEXT_PUBLIC_WHATSAPP \
    NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p public && npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 TZ=America/Sao_Paulo
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]

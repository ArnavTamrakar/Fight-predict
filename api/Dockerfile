FROM node:20-slim
WORKDIR /app

COPY src/package.json ./package.json
RUN npm install --omit=dev

COPY src ./src
COPY ml_service ./ml_service

ENV NODE_ENV=production
ENV PORT=8080
CMD ["node", "src/server.js"]

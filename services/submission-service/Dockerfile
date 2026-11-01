FROM node:20-alpine

WORKDIR /app

# Copy shared package
COPY shared /app/shared

# Copy service files
COPY services/submission-service /app/services/submission-service

WORKDIR /app/shared
RUN npm install --omit=dev

WORKDIR /app/services/submission-service
RUN npm install --omit=dev

EXPOSE 5003

USER node

CMD ["node", "src/index.js"]

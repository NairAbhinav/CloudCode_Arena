FROM node:20-alpine

WORKDIR /app

# Copy shared package
COPY shared /app/shared

# Copy service files
COPY services/reporting-service /app/services/reporting-service

WORKDIR /app/shared
RUN npm install --omit=dev

WORKDIR /app/services/reporting-service
RUN npm install --omit=dev

EXPOSE 5004

USER node

CMD ["node", "src/index.js"]

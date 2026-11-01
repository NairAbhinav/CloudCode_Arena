FROM node:20-alpine

WORKDIR /app

# Copy shared package
COPY shared /app/shared

# Copy service files
COPY services/assessment-service /app/services/assessment-service

WORKDIR /app/shared
RUN npm install --omit=dev

WORKDIR /app/services/assessment-service
RUN npm install --omit=dev

EXPOSE 5002

USER node

CMD ["node", "src/index.js"]

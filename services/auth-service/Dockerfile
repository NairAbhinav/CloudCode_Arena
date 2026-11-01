FROM node:20-alpine

WORKDIR /app

# Copy shared package
COPY shared /app/shared

# Copy service files
COPY services/auth-service /app/services/auth-service

WORKDIR /app/shared
RUN npm install --omit=dev

WORKDIR /app/services/auth-service
RUN npm install --omit=dev

EXPOSE 5001

USER node

CMD ["node", "src/index.js"]

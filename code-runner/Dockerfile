# Use eclipse-temurin:17-jdk-alpine as base — Java JDK already included!
# This avoids downloading 55 packages for openjdk on a plain alpine/node image.
FROM eclipse-temurin:17-jdk-alpine

# Install Node.js, Python 3, gcc, g++, musl-dev and create node user
RUN apk add --no-cache nodejs npm python3 gcc g++ musl-dev && \
    adduser -D -u 1001 node

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .
RUN chown -R node:node /app

EXPOSE 5005

USER node

CMD ["node", "src/index.js"]

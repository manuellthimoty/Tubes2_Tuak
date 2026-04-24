FROM node:20-alpine

WORKDIR /app

COPY src/backend/package*.json ./
RUN npm ci

COPY src/backend/ ./

EXPOSE 3000

CMD ["npm", "run", "dev"]

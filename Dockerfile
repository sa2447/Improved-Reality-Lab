FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build
RUN chmod +x docker/start.sh

ENV NODE_ENV=production

EXPOSE 3000
CMD ["sh", "./docker/start.sh"]

FROM node:20-alpine AS base

WORKDIR /app

COPY package.json ./
RUN npm install --quiet

COPY . .

ARG VITE_API_BASE="/api"
ENV VITE_API_BASE=${VITE_API_BASE}

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=base /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

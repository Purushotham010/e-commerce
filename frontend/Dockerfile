# Stage 1: Build React application
FROM node:20-alpine AS build
WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy source files and build production bundle
COPY . .
RUN npm run build

# Stage 2: Serve bundle with lightweight Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Clean default nginx files
RUN rm -rf ./*

# Copy built bundle from stage 1
COPY --from=build /app/dist .

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose public HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install 'serve' to serve the static files
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/build ./build

EXPOSE 3000

# Use 'serve' to run the app on the port provided by Railway
CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]

FROM node:18 AS build

WORKDIR /app

# Copy package files for both backend and frontend
COPY package*.json ./
COPY src/frontend/package*.json ./src/frontend/

# Install backend and frontend dependencies
RUN npm install
RUN cd src/frontend && npm install

# Copy all application code
COPY . .

# Build the React app
RUN cd src/frontend && npm run build

# Final stage - remove dev dependencies to keep image smaller
FROM node:18-slim

WORKDIR /app

# Copy package files for production
COPY package*.json ./
RUN npm install --production

# Copy built application
COPY --from=build /app/src/server.js /app/src/
COPY --from=build /app/src/comparator.js /app/src/
COPY --from=build /app/src/reportGenerator.js /app/src/
COPY --from=build /app/src/utils.js /app/src/
COPY --from=build /app/src/public /app/src/public/
COPY --from=build /app/src/frontend/dist /app/src/frontend/dist/
COPY --from=build /app/reports /app/reports/

# Expose port 4000 (matching the updated port in server.js)
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "src/server.js"]

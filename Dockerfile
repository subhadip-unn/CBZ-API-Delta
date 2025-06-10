FROM node:18

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose port 3000
EXPOSE 3000

# Set environment variables if needed
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "src/server.js"]

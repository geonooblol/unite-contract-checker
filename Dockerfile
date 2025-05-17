FROM ghcr.io/puppeteer/puppeteer:21.5.0

USER root

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Run the application
CMD ["node", "index.js"]

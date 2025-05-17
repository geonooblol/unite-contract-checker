FROM ghcr.io/puppeteer/puppeteer:21.5.0

USER root

# Create directories for screenshots
RUN mkdir -p /tmp && chmod 777 /tmp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Make sure we can create screenshots
RUN chmod -R 777 /tmp

# Run the application
CMD ["node", "index.js"]

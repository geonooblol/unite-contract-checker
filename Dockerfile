FROM ghcr.io/puppeteer/puppeteer:21.5.0

USER root

# Fix for Google Chrome repository key error
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && rm -rf /etc/apt/sources.list.d/google-chrome.list \
    && rm -rf /etc/apt/sources.list.d/google.list

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

# Set memory limits for Node.js
ENV NODE_OPTIONS="--max-old-space-size=512"

# Run the application
CMD ["node", "index.js"]

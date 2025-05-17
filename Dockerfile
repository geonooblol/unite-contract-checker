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

# System dependencies to improve browser stability
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

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

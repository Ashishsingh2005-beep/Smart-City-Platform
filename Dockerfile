# Use official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy the rest of the application files
COPY . .

# Expose the server port
EXPOSE 3000

# Start the application
CMD [ "node", "server.js" ]

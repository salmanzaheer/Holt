# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Install build dependencies for sqlite3 (python3, make, g++) if prebuilts fail, 
# and ffmpeg for video thumbnails/processing if needed.
RUN apk add --no-cache python3 make g++ ffmpeg

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install any needed packages
RUN npm install

# Bundle app source
COPY . .

# Create storage and data directories
RUN mkdir -p storage data

# Make port 3001 available to the world outside this container
EXPOSE 3001

# Define the command to run your app
CMD [ "node", "server.js" ]
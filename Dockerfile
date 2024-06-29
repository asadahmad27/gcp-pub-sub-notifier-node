FROM node:19.5.0-alpine

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --verbose
RUN npm cache clean --force

# Copy the rest of your application
COPY . .

# Expose the port your app runs on
EXPOSE 8080

# Command to run the application
CMD ["npm", "start"]
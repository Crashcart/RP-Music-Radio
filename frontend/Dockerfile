FROM node:lts-alpine

WORKDIR /usr/src/app

# Install ALL dependencies (including devDependencies for Vite)
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --silent && mv node_modules ../

COPY . .
EXPOSE 5173

RUN chown -R node /usr/src/app
USER node

# Run Vite dev server (bind to all interfaces for Docker networking)
CMD ["npm", "run", "dev", "--", "--host"]

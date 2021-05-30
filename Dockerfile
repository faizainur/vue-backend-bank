FROM node:12.18-alpine
ENV NODE_ENV=production
ENV CLIENT_SECRET=""
ENV CLIENT_ID=""
ENV WEB_CLIENT_URL=""
ENV BANK_NAME=""
ENV MONGODB_URI=""
ENV CALLBACK_URL=""

WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 4000
CMD ["npm", "start"]

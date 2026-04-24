FROM nginx:1.27-alpine

COPY src/frontend/index.html /usr/share/nginx/html/index.html
COPY src/frontend/script.js /usr/share/nginx/html/script.js
COPY src/frontend/style.css /usr/share/nginx/html/style.css
COPY src/frontend/asset/ /usr/share/nginx/html/asset/

EXPOSE 80

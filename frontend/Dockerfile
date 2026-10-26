# --- build stage ---
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_BASE_URL=/api
ARG VITE_RAZORPAY_KEY_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID
RUN npm run build

# --- serve stage ---
# Official nginx images auto-run envsubst on *.template files in
# /etc/nginx/templates/ into /etc/nginx/conf.d/ before starting (built into
# the image's own entrypoint) — no custom CMD needed.
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=backend:8000 \
    SERVER_NAME=_ \
    ADMIN_SERVER_NAME=admin.invalid

EXPOSE 80

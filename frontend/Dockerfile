FROM node:24-alpine AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /usr/src/app/frontend

COPY package.json pnpm-lock.yaml* ./

# Install and pin pnpm to a specific version
RUN corepack enable \
    && corepack prepare pnpm@10.32.1 --activate \
    && mkdir -p /pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build


FROM nginx:alpine

COPY --from=build /usr/src/app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

RUN apk add --no-cache gettext

CMD ["sh", "-c", "\
    envsubst '${VITE_DSPACE_API_URL} ${VITE_DJANGO_API_URL}' \
      < /etc/nginx/conf.d/default.conf.template \
      > /etc/nginx/conf.d/default.conf && \
    exec nginx -g 'daemon off;' \
"]

EXPOSE 80
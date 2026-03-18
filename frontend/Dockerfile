FROM node:24-alpine AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /usr/src/app/frontend

COPY package.json .

# Install pnpm globally
RUN corepack enable pnpm

RUN mkdir -p /pnpm

RUN pnpm install

COPY . .

RUN pnpm build


FROM nginx:alpine

COPY --from=build /usr/src/app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf.template
RUN apk add --no-cache gettext

CMD ["sh", "-c", "\
    envsubst '${VITE_DSPACE_API_URL} ${VITE_DJANGO_API_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && \
    exec nginx -g 'daemon off;' \
    "]

EXPOSE 80


# 静态资源用构建机架构编译，运行层再安装目标架构的 Canvas。
FROM --platform=$BUILDPLATFORM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY index.html vite.config.ts tsconfig.json postcss.config.js tailwind.config.js ./
COPY src ./src
COPY public ./public
RUN bun run build

FROM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS runtime

# 使用系统中文字体和原生 Canvas 运行库，不依赖开发机字体或 Chrome。
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates fontconfig fonts-noto-cjk \
        libfontconfig1 libfreetype6 libstdc++6 libgcc-s1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/public ./public
RUN mkdir -p /data && chown bun:bun /data

ENV NODE_ENV=production \
    TYPESET_HOST=0.0.0.0 \
    PORT=4890 \
    TYPESET_DATA_DIR=/data

USER bun
VOLUME ["/data"]
EXPOSE 4890
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e 'const response = await fetch("http://127.0.0.1:" + (process.env.PORT || 4890) + "/api/health"); if (!response.ok || (await response.json()).status !== "ok") process.exit(1)'

# 容器必须显式配置密钥，避免首次启动生成临时 .env。
CMD ["sh", "-c", ": \"${TYPESET_ADMIN_KEY:?TYPESET_ADMIN_KEY must be supplied at runtime}\"; exec bun run src/server/index.ts"]

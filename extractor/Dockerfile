FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl ffmpeg unzip \
  && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
  && curl -L https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server.mjs ./server.mjs

ENV PORT=8787
ENV DENO_INSTALL=/usr/local
ENV PATH="/usr/local/bin:${PATH}"
EXPOSE 8787

CMD ["node", "server.mjs"]

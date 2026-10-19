# yattee-web

Standalone web client for Yattee Server.

# Docker

```yaml
services:
  yattee-server:
    image: yattee/yattee-server:latest
    volumes:
      - yattee-server-data:/app/data
      - yattee-server-downloads:/downloads

  yattee-web:
    image: ghcr.io/heywoodlh/yattee-web:latest
    ports:
      - "8080:8080"
    volumes:
      - yattee-web-data:/data
    environment:
      YATTEE_SERVER_URL: http://yattee-server:8085
    depends_on:
      - yattee-server

volumes:
  yattee-server-data:
  yattee-server-downloads:
  yattee-web-data:
```

# FortuneTab NAS 배포 가이드

## 사전 요구사항
- NAS: Synology DSM + Container Manager (Docker) 설치
- NAS SSH 활성화 (DSM > 제어판 > 터미널 및 SNMP)
- n8n 컨테이너가 이미 실행 중

## Step 1: 프로젝트 파일 NAS에 전송

```bash
# PC에서 실행
scp -r pdf-server/ root@192.168.219.108:/volume1/docker/fortunetab/pdf-server/
scp -r src/lib/ root@192.168.219.108:/volume1/docker/fortunetab/src/lib/
scp Dockerfile.pdf-server root@192.168.219.108:/volume1/docker/fortunetab/
scp docker-compose.yml root@192.168.219.108:/volume1/docker/fortunetab/
scp .dockerignore root@192.168.219.108:/volume1/docker/fortunetab/
```

## Step 2: NAS에 SSH 접속

```bash
ssh root@192.168.219.108
cd /volume1/docker/fortunetab
```

## Step 3: 환경변수 파일 생성

```bash
cat > .env << 'EOF'
ANTHROPIC_API_KEY=sk-ant-api03-여기에_실제_키
TOSS_SECRET_KEY=test_sk_여기에_실제_키
EOF
```

## Step 4: n8n Docker 네트워크 확인

```bash
# n8n이 사용하는 네트워크 이름 확인
docker network ls | grep n8n
# 예: n8n_default 또는 bridge

# docker-compose.yml의 networks.fortunetab.name 값을 위 결과와 맞추기
```

## Step 5: Docker 빌드 및 실행

```bash
# 빌드
docker compose build pdf-server

# 실행
docker compose up -d pdf-server

# 로그 확인
docker compose logs -f pdf-server
```

## Step 6: 연결 테스트

```bash
# NAS 내부에서
curl http://localhost:4001/health

# PC에서
curl http://192.168.219.108:4001/health
```

## Step 7: n8n 워크플로우 URL 변경

n8n 워크플로우의 PDF 생성 URL을 변경:

**변경 전**: `http://192.168.219.104:4001`
**변경 후**: `http://fortunetab-pdf-server:4001` (같은 Docker 네트워크)

또는 NAS 호스트에서 접근: `http://host.docker.internal:4001`

## 문제 해결

### Chromium 실행 오류
```bash
# --no-sandbox 필요 (Docker 내부)
# Dockerfile에서 이미 설정됨: PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### 한글 폰트 깨짐
```bash
# Noto CJK 폰트가 설치됨 (Dockerfile)
# Google Fonts는 template.html에서 CDN 로드
```

### n8n에서 pdf-server 접근 불가
```bash
# 같은 Docker 네트워크에 있는지 확인
docker network inspect n8n_default | grep fortunetab
```

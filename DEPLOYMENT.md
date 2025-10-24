# Deployment Guide - koco.me/new

이 문서는 Docker와 GitHub Actions를 사용하여 AWS에 애플리케이션을 배포하는 방법을 설명합니다.

## 📋 목차
1. [사전 준비](#사전-준비)
2. [GitHub Secrets 설정](#github-secrets-설정)
3. [AWS 서버 설정](#aws-서버-설정)
4. [로컬 테스트](#로컬-테스트)
5. [배포 프로세스](#배포-프로세스)
6. [문제 해결](#문제-해결)

## 🔧 사전 준비

### 필요한 항목
- Docker Hub 계정 (또는 AWS ECR)
- AWS EC2 인스턴스 (nginx 설치됨)
- GitHub 저장소에 대한 쓰기 권한
- 환경 변수 값들 (데이터베이스, AWS, OAuth 등)

## 🔐 GitHub Secrets 설정

GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 시크릿을 추가하세요:

### Docker 관련
```
DOCKER_USERNAME=your_dockerhub_username
DOCKER_PASSWORD=your_dockerhub_password
```

### AWS 서버 접속 정보
```
AWS_HOST=your.server.ip.address
AWS_USERNAME=ubuntu (또는 ec2-user)
AWS_SSH_KEY=-----BEGIN RSA PRIVATE KEY-----
your private key content here
-----END RSA PRIVATE KEY-----
```

### 애플리케이션 환경 변수
```
DATABASE_URL=mysql://user:pass@host:port/db
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=koco-dental-files
NEXTAUTH_URL=https://koco.me/new
NEXTAUTH_SECRET=your_secret
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

## 🖥️ AWS 서버 설정

### 1. Docker 설치 (아직 설치하지 않은 경우)
```bash
sudo apt update
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 2. 배포 디렉토리 생성
```bash
sudo mkdir -p /opt/koco-new
sudo chown $USER:$USER /opt/koco-new
```

### 3. nginx 설정

#### nginx 설정 파일 복사
로컬의 `nginx/koco-new.conf` 파일을 참고하여 서버의 nginx 설정을 업데이트하세요:

```bash
# 서버에서 실행
sudo nano /etc/nginx/sites-available/koco.me
```

기존 server 블록에 다음 내용을 추가:

```nginx
# Upstream for koco-new
upstream koco_nextjs_new {
    server localhost:3002;
    keepalive 64;
}

# 기존 server 블록 내부에 추가
location /new {
    proxy_pass http://koco_nextjs_new;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

location ~* ^/new/_next/static/ {
    proxy_pass http://koco_nextjs_new;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### nginx 설정 테스트 및 재시작
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 방화벽 설정
```bash
# 포트 3002가 localhost에서만 접근 가능한지 확인
sudo ufw status
# 필요하면 HTTP/HTTPS만 허용
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## 🧪 로컬 테스트

배포하기 전에 로컬에서 Docker 이미지를 테스트하세요:

### 1. 환경 변수 파일 생성
```bash
cp .env.production.example .env.production
# .env.production 파일을 실제 값으로 수정
```

### 2. Docker Compose로 테스트
```bash
docker-compose up --build
```

### 3. 브라우저에서 확인
```
http://localhost:3002/new
```

### 4. 중지
```bash
docker-compose down
```

## 🚀 배포 프로세스

### 자동 배포 (권장)
1. 코드를 master 브랜치에 푸시
```bash
git add .
git commit -m "Deploy to production"
git push origin master
```

2. GitHub Actions가 자동으로:
   - Docker 이미지 빌드
   - Docker Hub에 푸시
   - AWS 서버에 배포
   - 컨테이너 재시작

3. GitHub Actions 탭에서 진행 상황 확인

### 수동 배포
필요한 경우 수동으로 배포할 수 있습니다:

```bash
# 로컬에서 이미지 빌드
docker build -t your-username/koco-nextjs:latest .

# Docker Hub에 푸시
docker push your-username/koco-nextjs:latest

# AWS 서버에 SSH 접속
ssh user@your-server

# 배포 디렉토리로 이동
cd /opt/koco-new

# 최신 이미지 가져오기
docker pull your-username/koco-nextjs:latest

# 기존 컨테이너 중지 및 제거
docker stop koco-nextjs-new
docker rm koco-nextjs-new

# 새 컨테이너 실행
docker run -d \
  --name koco-nextjs-new \
  --restart unless-stopped \
  -p 3002:3000 \
  --env-file .env \
  your-username/koco-nextjs:latest

# 로그 확인
docker logs -f koco-nextjs-new
```

## 🔍 문제 해결

### 컨테이너 로그 확인
```bash
# 서버에서
docker logs koco-nextjs-new
docker logs -f koco-nextjs-new  # 실시간 로그
```

### 컨테이너 상태 확인
```bash
docker ps
docker ps -a  # 중지된 컨테이너 포함
```

### 컨테이너 내부 접속
```bash
docker exec -it koco-nextjs-new sh
```

### nginx 로그 확인
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 데이터베이스 연결 테스트
```bash
# 컨테이너 내부에서
docker exec -it koco-nextjs-new sh
npx prisma db pull  # 데이터베이스 연결 확인
```

### 이미지 정리
```bash
# 사용하지 않는 이미지 제거
docker image prune -a
```

### 포트 확인
```bash
# 3002 포트가 사용 중인지 확인
sudo netstat -tulpn | grep 3002
```

## 📝 배포 체크리스트

배포 전 확인사항:
- [ ] GitHub Secrets 모두 설정됨
- [ ] .env.production 파일에 모든 환경 변수 설정
- [ ] AWS 서버에 Docker 설치됨
- [ ] nginx 설정 업데이트 및 재시작됨
- [ ] DATABASE_URL이 서버에서 접근 가능한지 확인
- [ ] S3 버킷 권한 설정 확인
- [ ] Google OAuth 리디렉션 URL에 https://koco.me/new 추가
- [ ] 로컬에서 Docker 이미지 테스트 완료

배포 후 확인사항:
- [ ] https://koco.me/new 접속 가능
- [ ] 로그인 기능 정상 작동
- [ ] 이미지 업로드/조회 정상 작동
- [ ] 데이터베이스 연결 정상
- [ ] API 엔드포인트 정상 응답

## 🔄 롤백 방법

문제가 발생한 경우 이전 버전으로 롤백:

```bash
# 서버에서
docker stop koco-nextjs-new
docker rm koco-nextjs-new

# 이전 이미지 태그로 실행 (예: 특정 커밋 SHA)
docker pull your-username/koco-nextjs:abc1234
docker run -d \
  --name koco-nextjs-new \
  --restart unless-stopped \
  -p 3002:3000 \
  --env-file .env \
  your-username/koco-nextjs:abc1234
```

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. GitHub Actions 로그
2. Docker 컨테이너 로그
3. nginx 에러 로그
4. 네트워크 연결 상태

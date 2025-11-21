# 🌧️ FloodGuard – Hệ Thống Cảnh Báo & Giám Sát Ngập Lụt Tích Hợp Dự Báo Thời Tiết  
**(IoT + Blynk + Weather API + Proxy + WebGIS + Smart Routing)**

---

## 📌 Mục lục

- [1. Giới thiệu](#1-giới-thiệu)
- [2. Vấn đề thực tế](#2-vấn-đề-thực-tế)
- [3. Mục tiêu hệ thống](#3-mục-tiêu-hệ-thống)
- [4. Phạm vi hệ thống](#4-phạm-vi-hệ-thống)
- [5. Đối tượng sử dụng](#5-đối-tượng-sử-dụng)
- [6. Kiến trúc tổng thể](#6-kiến-trúc-tổng-thể)
- [7. Kiến trúc chi tiết](#7-kiến-trúc-chi-tiết)
  - [7.1 IoT Layer (Flood Node)](#71-iot-layer-flood-node)
  - [7.2 Weather API Layer](#72-weather-api-layer)
  - [7.3 Proxy & Ngrok Gateway](#73-proxy--ngrok-gateway)
  - [7.4 WebGIS Frontend](#74-webgis-frontend)
  - [7.5 Kiến trúc dữ liệu](#75-kiến-trúc-dữ-liệu)
- [8. Luồng hoạt động hệ thống](#8-luồng-hoạt-động-hệ-thống)
  - [8.1 End-to-End Flow](#81-end-to-end-flow)
  - [8.2 Luồng IoT Node](#82-luồng-iot-node)
  - [8.3 Luồng Fetch Weather API (Fail-Safe)](#83-luồng-fetch-weather-api-fail-safe)
  - [8.4 Luồng tương tác WebGIS](#84-luồng-tương-tác-webgis)
  - [8.5 Luồng Routing Tránh Ngập](#85-luồng-routing-tránh-ngập)
  - [8.6 Sequence Diagrams](#86-sequence-diagrams)

---

# 1. Giới thiệu

**FloodGuard** là hệ thống giám sát & cảnh báo ngập lụt thời gian thực, kết hợp dữ liệu từ:

- **IoT Node đo mực nước**
- **Blynk App** (cảnh báo tức thời)
- **Weather API nội bộ (dự báo 180 phút)**
- **Proxy Server + Ngrok** (publish API)
- **WebGIS Dashboard**
- **Smart Detour Routing** (đề xuất đường tránh ngập)

Mục tiêu: hỗ trợ người dân, chính quyền và giao thông đô thị ra quyết định nhanh hơn trong điều kiện thời tiết xấu.

---

# 2. Vấn đề thực tế

- Ngập úng cục bộ xảy ra thường xuyên sau mưa lớn.  
- Người dân không biết đường nào đi được, đường nào đang ngập.  
- Không có dự báo thực sự cho từng điểm ngập (đang rút hay dâng?).  
- API thời tiết nội bộ không thể gọi từ cloud (Vercel).  
- Thiếu hệ thống liên thông IoT → Weather → Map → Routing.

FloodGuard giải quyết toàn bộ những vấn đề trên.

---

# 3. Mục tiêu hệ thống

### 🎯 Mục tiêu chức năng
- Đo mực nước thời gian thực.
- Cảnh báo mức nguy hiểm: SAFE / WARNING / DANGER.
- Dự báo xu hướng nước 30 → 180 phút.
- Gợi ý đường tránh ngập.
- Hiển thị WebGIS trực quan.
- Cảnh báo qua Blynk App.

### 🎯 Mục tiêu kỹ thuật
- Tích hợp IoT – Blynk – Weather API – Proxy – WebGIS.
- Hoạt động cả Local & Cloud.
- Fail-Safe khi API thời tiết bị lỗi.
- Smart Routing tối ưu.

---

# 4. Phạm vi hệ thống

### ✔ Bao gồm
- Trạm IoT đo mực nước.
- API dự báo thời tiết.
- Proxy Server + Ngrok.
- WebGIS Routing & Dashboard.
- Cảnh báo Blynk.

### ❌ Không bao gồm
- Điều khiển máy bơm nước.
- Phân tích thuỷ văn nâng cao.
- Giao thức NB-IoT/LoRaWAN.

---

# 5. Đối tượng sử dụng

- Người dân lưu thông trong khu vực.
- Cảnh sát giao thông.
- Cơ quan quản lý đô thị.
- Đội vận hành thoát nước.
- Sinh viên/người đi làm.

---

# 6. Kiến trúc tổng thể
```

┌─────────────────────────────┐
│ IoT Layer (ESP32 Node)      | 
│      → Blynk Cloud          |
└───────────┬─────────────────┘
│
┌───────────▼─────────────────┐
│ Weather API (26.xxx) │
└───────────┬─────────────────┘
│
┌───────────▼─────────────────┐
│ Proxy Server + Ngrok HTTPS │
└───────────┬─────────────────┘
│
┌───────────▼─────────────────┐
│ WebGIS (Map + Routing + AI) │
└─────────────────────────────┘


```

# 7. Kiến trúc chi tiết

---

## 7.1 IoT Layer (Flood Node)

### 🧩 Phần cứng
- ESP32 / ESP-WROOM  
- JSN-SR04T hoặc SR04M-2  
- OLED, Buzzer, LED  
- WiFi

### 🧠 Chu trình hoạt động
```
WiFi Connect
→ Blynk Connect
→ Đọc mực nước (d)
→ Tính mực nước thực tế (H - d)
→ Xác định trạng thái
→ Gửi lên Blynk (V0,V1,V2)
→ Nhận ngưỡng từ Blynk (V10,V11)
→ Hiển thị OLED / bật Buzzer
→ Lặp chu kỳ

```

## 7.2 Weather API Layer

Chỉ chạy trong VPN (Radmin):  
GET http://26.155.232.77:4567/api/current

less
Copy code

Trả về:

- Nhiệt độ  
- Độ ẩm  
- Áp suất  
- Lux  
- Dự báo thời tiết 30–180 phút  
- Vị trí trạm

Matching với node ngập theo bán kính **5km**.

---

## 7.3 Proxy & Ngrok Gateway

### 🖥 Proxy Server (Node.js)
- Gửi request từ Web → Weather API
- Timeout + Retry
- CORS Fix
- Trả về `{ isMock, stations }`

### 🌐 Ngrok Tunnel
Xuất bản API nội bộ thành URL HTTPS:

https://xxxxx.ngrok-free.dev/api/weather

yaml
Copy code

Được gọi trực tiếp từ Web Vercel.

---

## 7.4 WebGIS Frontend

### 🔧 Công nghệ
- React + Vite
- TypeScript
- TailwindCSS
- Leaflet Map
- Leaflet Routing Machine (OSRM)
- Ngrok API / Simulation Mode

### 🗺 Chức năng
- Hiển thị điểm ngập
- Phân tích & dự báo theo thời tiết
- Chọn trạm gần nhất (5km)
- Smart Detour Routing
- Dashboard Statistics
- Bottom Sheet UI

---

## 7.5 Kiến trúc dữ liệu

### 🌧 Flood Node
```ts
{ id, name, lat, lng, currentLevel, status }
☁ Weather Station
ts
Copy code
{
  id, station, coords,
  temperature, humidity, pressure, lux,
  predict: { current_status, forecast[] }
}
```
#8. Luồng hoạt động hệ thống
##8.1 End-to-End Flow
```
ESP32 → Blynk Cloud
           ↓
   Web Flood Map ← Proxy ← Weather API (26.xxx)
           ↓
   Smart Detour Routing
           ↓
     Dashboard hiển thị
```
##8.2 Luồng IoT Node
```
ESP32 → Sensor → ESP32
   ↓           ↓
Cảnh báo  ←→  Blynk Cloud
   ↓
Người dùng xem trên App
```
##8.3 Luồng Fetch Weather API (Fail-Safe)
```
Web → Proxy → Weather API
          ↑
          │ success
          │
          └──> isMock: false

Nếu lỗi:
Proxy → Web → Simulation Mode (isMock: true)
```
##8.4 Luồng tương tác WebGIS
Khi mở web:
```
Load map → getLocation → fetchStations → fetchWeather → render
Khi click trạm ngập:
```
```
Lấy vị trí trạm
→ tìm trạm thời tiết gần nhất 5km
→ nếu có → hiện dự báo 180 phút
→ nếu không → báo "Không có trạm gần"
```
##8.5 Luồng Routing Tránh Ngập
```
Base Route
→ Detect Flood Segments
→ Generate Detour Points
→ Router.route(k candidates)
→ Evaluate (distance + exposure + penalty)
→ Pick Best Route
→ Render
```
##8.6 Sequence Diagrams
```
IoT Node

ESP32 → Sensor → ESP32 → Blynk → User
Weather Fetch
javascript
Copy code
Frontend → Proxy → Weather API → Proxy → Frontend
Routing
javascript
Copy code
User → RoutingMachine → OSRM → RoutingMachine → Map
```
#9. Thuật Toán Chi Tiết
##9.1. Thuật toán đo mực nước (IoT Node)
Công thức đo mực nước
```bash
water_level = max(0, SENSOR_HEIGHT - measured_distance)
```
Phân loại mức độ ngập
Điều kiện	Trạng thái
```
water_level < WARNING_THRESHOLD	SAFE
WARNING_THRESHOLD ≤ water_level < DANGER_THRESHOLD	WARNING
water_level ≥ DANGER_THRESHOLD	DANGER
```
Lọc nhiễu cảm biến
```
Đo 3 lần → lấy trung bình

Loại bỏ giá trị sai lệch > 30%

Tránh sai số khi trời mưa, nước bắn, rung cảm biến
```
Cảnh báo cục bộ
```
LED xanh → SAFE

LED vàng → WARNING

LED đỏ + Buzzer → DANGER (kích hoạt từ ESP32)
```
Gửi dữ liệu lên Blynk Cloud
```
V0 = Mực nước (cm)
V1 = Trạng thái (SAFE/WARNING/DANGER)
V2 = % ngập
```
##9.2. Thuật toán matching trạm thời tiết (Bán kính 5km)
```
Tính khoảng cách Haversine
distance_km = 2R * asin( sqrt(
    sin²((lat2-lat1)/2) +
    cos(lat1)*cos(lat2)*sin²((lng2-lng1)/2)
))
```
Logic matching
```
Tìm trạm gần nhất → nếu khoảng cách ≤ 5km → dùng trạm đó
Nếu > 5km → Không có dự báo cho điểm ngập này
```
Suy luận xu hướng mưa – ngập (dựa vào forecast API)
Tín hiệu thời tiết	Dự báo
humidity tăng	khả năng nước dâng
humidity giảm	nước rút dần
temp giảm + humidity tăng	có thể mưa to
lux giảm mạnh	trời âm u → mưa

Hệ thống dự báo 30 – 180 phút.

##9.3. Thuật toán Smart Flood Routing (Né ngập thông minh)
Bước 1 – Lấy route gốc từ OSRM
```
router.route([start, end])
```
Bước 2 – Scan đoạn ngập
```
Mỗi điểm trên route được kiểm tra với các trạm ngập

Nếu cách trạm DANGER ≤ 500m → đánh dấu đoạn nguy hiểm
```
Bước 3 – Nếu route an toàn → giữ nguyên
```
if (no_flood_segment) return baseRoute
```
Bước 4 – Tạo danh sách điểm né tránh (detour candidates)
```
Tính midpoint + vector vuông góc với đoạn route:

offsets = [±0.002, ±0.004, ±0.006]   // tương đương 200–600m
detourPoints = midpoint + normal_vector * offset
```
Bước 5 – Fallback khi vector vuông góc không dùng được
```
fallbackPoint = routePoint + normalize(routePoint → station) * 0.006
```
Bước 6 – Sinh route ứng viên
```
router.route([start, pStart, detourPoint, pEnd, end])
```
Bước 7 – Tính điểm chất lượng
```
score = distance + flood_exposure * 50
```
Bước 8 – Chọn route có điểm thấp nhất
```
Candidate tốt nhất = route cuối cùng.
```
9.4. Fail-safe Weather System
```
Hệ thống có hai chế độ:

🟢 LIVE MODE

Ngrok hoạt động

API server 26.xxx online

Dữ liệu thật

🟡 SIMULATION MODE

API lỗi / Ngrok timeout / VPN tắt

Web tự dùng mock data

Không crash web
```
#10. Hướng Dẫn Cài Đặt & Deploy
##10.1. Chạy Local
Cài dependencies
```
npm install

Tạo file .env
VITE_WEATHER_API=https://xxxxxx.ngrok-free.dev/api/weather
```
Chạy server dev
```
npm run dev
```
##10.2. Chạy Proxy Server (chuyển API LAN → Public)
```
cd flood-proxy
npm install
node proxy.js


Proxy chạy tại:

http://localhost:4000/api/weather
```
##10.3. Publish API bằng Ngrok (public hóa)
```
ngrok http 4000
```

Nhận URL như:

```
https://soft-mango-1234.ngrok-free.dev/api/weather

Dán vào .env.
```
##10.4. Deploy Web lên Vercel
```
Cách 1: CLI
vercel

Cách 2: Dashboard

Import repo từ GitHub

Set Environment Variables:

VITE_WEATHER_API=https://xxxx.ngrok-free.dev/api/weather


Reload lại web là chạy được.
```
##10.5. Kết nối Blynk App (IoT → Cloud)
```
Tạo Template

Tạo Datastreams: V0 | V1 | V2

Flash ESP32

Cảm biến gửi dữ liệu → Blynk Cloud → Web map đọc

Blynk App hiển thị realtime:

Mực nước

Trạng thái

% ngập

Cảnh báo qua Notification
```
#11. API Reference
##11.1. Blynk API (IoT → Cloud)
Lấy mực nước
```
GET https://blynk.cloud/external/api/get?token=<TOKEN>&V0
```
Lấy trạng thái
GET ...&V1

Lấy % ngập
GET ...&V2

##11.2. Weather API (LAN/VPN server)
```
GET http://26.155.232.77:4567/api/current

Example response:

{
  "station": "Hà Đông",
  "temperature": 25.6,
  "humidity": 49.2,
  "predict": { ... }
}
```
##11.3. Public Proxy API (Public Internet)
```
GET https://xxxxx.ngrok-free.dev/api/weather

Response:

{
  "isMock": false,
  "stations": [
    ...
  ]
}


Nếu lỗi:

{
  "isMock": true,
  "stations": MOCK_DATA
}
```
##11.4. Web Internal Logic
Tìm trạm thời tiết gần nhất
```
findNearestWeatherStation(lat, lng)

Routing Tránh Ngập
RoutingMachine(start, end, avoidFloodMode)
```
#12. Sơ đồ hệ thống (Architecture Diagrams)
##12.1. High-Level Architecture Diagram
```     ┌────────────────────┐
        │   Weather API       │
        │ (26.xx LAN Server)  │
        └─────────┬──────────┘
                  │  (LAN)
                  ▼
        ┌────────────────────┐
        │   Proxy Server     │
        │  (Node.js + Ngrok) │
        └─────────┬──────────┘
                  │  (Public HTTPS)
                  ▼
        ┌────────────────────┐
        │   Web App (Vercel) │
        │ React + Leaflet    │
        └─────────┬──────────┘
                  │  (API Fetch)
                  ▼
        ┌────────────────────┐
        │ Smart Routing/AI   │
        │ Weather Matching   │
        └─────────┬──────────┘
                  │
    ┌───────────────────────────────┐
    │               Map              │
    │  IoT Stations + Weather + UI   │
    └───────────────────────────────┘
                  ▲
                  │
        ┌─────────┴─────────┐
        │     Blynk Cloud    │
        └─────────┬─────────┘
                  │ (MQTT/HTTP)
                  ▼
        ┌────────────────────┐
        │   ESP32 Sensors    │
        │  Water Level Nodes │
        └────────────────────┘
```
##12.2. Luồng dữ liệu tổng thể (Data Flow Diagram)
```
[ESP32] → Blynk Cloud → WebApp → Routing/Forecast → UI
```
```
Weather API (LAN) → Proxy+Ngrok → WebApp
```
##12.3. Module Diagram
```
IoT Module

Sensor Driver

Error Handler

Blynk Uploader

Web Module

MapComponent

RoutingMachine

WeatherService

DashboardStats

StationDetailPanel

Server Module

Weather Proxy

CORS Layer

Fail-Safe JSON Handler
```
#13. Thiết kế giao diện (UI/UX Design)
##13.1. Trang chính
```
Bản đồ Leaflet toàn màn hình

Marker trạng thái:

🟢 SAFE

🟡 WARNING

🔴 DANGER

Marker thời tiết với icon + nhiệt độ

Popup chi tiết trạm ngập
```
##13.2. Bottom Sheet (Route Panel)
```
Khoảng cách

Thời gian dự kiến

Mức độ an toàn

Nút: Suggest Safer Route
```
##13.3. Weather Forecast Panel
```
Trạng thái hiện tại

Dự báo 30/60/90/120/150/180 phút

Biểu đồ đường

Badge:

LIVE API

SIMULATION
```
#14. Demo Script (kịch bản trình bày khi bảo vệ)
```
Bạn có thể dùng script này để thuyết trình 8–10 phút.

##14.1. Mở đầu (1 phút)
```
“Chúng em xây dựng hệ thống giám sát ngập + điều hướng thông minh nhằm giảm rủi ro khi di chuyển trong mùa mưa. Hệ thống bao gồm IoT, WebGIS, dự báo thời tiết và thuật toán routing.”
```
```
##14.2. Giới thiệu tổng quan (1 phút)
```
IoT đo mực nước thực tế

Web kết hợp dữ liệu thời tiết

Dự báo mực nước 3 giờ

Gợi ý đường tránh ngập
```
##14.3. IoT Demo (2 phút)
```
ESP32 + JSN-SR04T

Gửi dữ liệu realtime lên Blynk

Cảnh báo bằng LED/Buzzer

Mô phỏng nước dâng/rút
```
##14.4. WebGIS Demo (3 phút)
```
Hiển thị trạng thái ngập

Nhấn vào trạm ngập → xem dự báo

Map zoom/di chuyển

LIVE vs SIMULATION MODE
```
##14.5. Smart Routing Demo (2 phút)
```
Chọn điểm đi/đến

Ấn “Suggest Safer Route”

Thuật toán né ngập hoạt động:

Vector offset

Fallback logic

Giảm flood exposure
```
##14.6. Kết luận (1 phút)
```
Hệ thống hoàn chỉnh end-to-end

Thử nghiệm thực tế trên nhiều thiết bị

Sẵn sàng triển khai ngoài thực tế
```
#15. Các thách thức kỹ thuật & cách giải quyết
15.1. Không truy cập được API LAN khi deploy
```
✔ Giải pháp: Node Proxy + Ngrok Public
→ Web luôn truy cập được thời tiết.
```
##15.2. Routing Machine bị nhảy giữa đường gốc và đường vòng
```
✔ Giải pháp:

detourAppliedRef

detourFailedRef

isAnalyzingRef
→ Ngăn vòng lặp tính toán.
```
##15.3. Tọa độ không hợp lệ khi sinh vector
```
✔ Thêm defensive check trước khi dùng .lat và .lng.
```
##15.4. Sensor drift khi trời mưa
```
✔ Lọc nhiễu 3 mẫu + bỏ outlier.

#16. Hướng phát triển tương lai
##16.1. Kỹ thuật

Tích hợp OSRM private server

Tối ưu vector-based routing

Sử dụng AI model dự đoán ngập theo chuỗi thời gian
```
##16.2. Chức năng
```
Push notification cho route nguy hiểm

Ứng dụng Mobile Flutter

Dashboard quản lý cho chính quyền
```

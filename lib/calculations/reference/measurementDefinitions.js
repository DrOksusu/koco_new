// Reference file for measurement calculation definitions
// 계측값 계산 정의 참고 파일

/**
 * This file contains reference JavaScript functions for cephalometric measurements
 * These will be converted to TypeScript and integrated into the calculation modules
 *
 * 이 파일은 두부계측 측정값 계산을 위한 참고용 JavaScript 함수들을 포함합니다
 * 이 함수들은 TypeScript로 변환되어 계산 모듈에 통합될 예정입니다
 */

// Place your reference calculation functions here
// 참고용 계산 함수들을 여기에 넣어주세요

function findNextEmptyLandmark() {
    for (let i = 0; i < messages.length; i++) {
      if (!landmarkCoordinates.hasOwnProperty(messages[i])) {
        return i;
      }
    }
    return messages.length; // 전부 입력되었으면 마지막 인덱스
  }
  
  function setupRightClickDelete(
    canvas,
    ctx,
    img,
    landmarkCoordinates,
    messages,
    $guideMessage,
    scaleX,
    scaleY
  ) {
    canvas.addEventListener("contextmenu", function (event) {
      event.preventDefault();
  
      if (Object.keys(landmarkCoordinates).length === 0) {
        alert("🚨 삭제할 점이 없습니다.");
        return;
      }
  
      const rect = canvas.getBoundingClientRect();
      const clickX = (event.clientX - rect.left) * scaleX;
      const clickY = (event.clientY - rect.top) * scaleY;
  
      // 🔍 클릭 위치 근처의 점 찾기
      let targetKey = null;
      let minDistance = Infinity;
  
      Object.entries(landmarkCoordinates).forEach(([key, coord]) => {
        const dx = coord.x - clickX;
        const dy = coord.y - clickY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 20 && distance < minDistance) {
          minDistance = distance;
          targetKey = key;
        }
      });
  
      if (!targetKey) {
        alert("❌ 클릭 근처에 삭제할 점이 없습니다.");
        return;
      }
  
      // 🔔 삭제 확인
      const confirmDelete = confirm(`❓ "${targetKey}" 점을 삭제하시겠습니까?`);
      if (!confirmDelete) return;
  
      // ✅ 삭제
      delete landmarkCoordinates[targetKey];
      console.log(`🗑️ 삭제된 점: ${targetKey}`);
  
      // ✅ 삭제된 점의 인덱스를 currentLandmarkIndex로 설정
      const deletedIndex = messages.indexOf(targetKey);
      if (deletedIndex !== -1) {
        currentLandmarkIndex = deletedIndex;
        console.log(
          `✏️ 다시 입력할 위치: ${messages[currentLandmarkIndex]} (${currentLandmarkIndex})`
        );
      }
  
      // ✅ 이미지 다시 그리기
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
      // ✅ 남은 점 다시 표시
      Object.entries(landmarkCoordinates).forEach(([key, coord]) => {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(coord.x / scaleX, coord.y / scaleY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
  
      // ✅ 가이드 메시지 업데이트
      $guideMessage.text(messages[currentLandmarkIndex]);
      speakMessage(messages[currentLandmarkIndex]);
    });
  }
  
  function calculateAngle(landmarkCoordinates, key1, key2, key3) {
    /**
     * 세 개의 랜드마크 키를 받아 key2를 기준으로 내각을 계산하는 함수
     *
     * @param {Object} landmarkCoordinates - 좌표를 저장한 딕셔너리
     * @param {string} key1 - 첫 번째 랜드마크 (예: "Sella")
     * @param {string} key2 - 기준이 되는 두 번째 랜드마크 (예: "Nasion")
     * @param {string} key3 - 세 번째 랜드마크 (예: "A-Point")
     * @returns {number} - 내각 (°) 값 (소수점 둘째 자리 반올림)
     */
  
    // ✅ 1. 입력된 키가 딕셔너리에 있는지 확인
    if (
      !(key1 in landmarkCoordinates) ||
      !(key2 in landmarkCoordinates) ||
      !(key3 in landmarkCoordinates)
    ) {
      console.error("❌ 입력된 키가 landmarkCoordinates에 존재하지 않습니다!");
      return null;
    }
  
    // ✅ 2. 좌표 가져오기
    const point1 = landmarkCoordinates[key1]; // 첫 번째 점
    const point2 = landmarkCoordinates[key2]; // 기준점 (각도의 꼭짓점)
    const point3 = landmarkCoordinates[key3]; // 세 번째 점
  
    // ✅ 3. 벡터 계산 (P2 -> P1, P2 -> P3)
    const vector1 = { x: point1.x - point2.x, y: point1.y - point2.y };
    const vector2 = { x: point3.x - point2.x, y: point3.y - point2.y };
  
    // ✅ 4. 벡터 내적(점곱) 계산
    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
  
    // ✅ 5. 벡터 크기(길이) 계산
    const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
    const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);
  
    // ✅ 6. 코사인 법칙을 사용하여 내각(°) 계산
    const cosTheta = dotProduct / (magnitude1 * magnitude2);
    const thetaRad = Math.acos(Math.min(Math.max(cosTheta, -1), 1)); // -1 ~ 1 범위로 제한
    const thetaDeg = (thetaRad * 180) / Math.PI;
  
    return Math.round(thetaDeg * 10) / 10; // ✅ 소수점 둘째 자리 반올림
  }
  
  function calculateIntersectionAngle(
    landmarkCoordinates,
    key1,
    key2,
    key3,
    key4
  ) {
    /**
     * 4개의 랜드마크 키를 받아, 두 직선이 이루는 내각을 계산하는 함수
     *
     * @param {Object} landmarkCoordinates - 좌표를 저장한 딕셔너리
     * @param {string} key1 - 첫 번째 직선의 시작점 (예: "Sella")
     * @param {string} key2 - 첫 번째 직선의 끝점이자 두 번째 직선의 시작점 (예: "Nasion")
     * @param {string} key3 - 두 번째 직선의 끝점이자 첫 번째 직선과 연결된 점 (예: "Nasion")
     * @param {string} key4 - 두 번째 직선의 끝점 (예: "A-Point")
     * @returns {number|null} - 내각 (°) 값 (소수점 둘째 자리 반올림) 또는 null (잘못된 입력)
     */
  
    // ✅ 1. 입력된 키가 딕셔너리에 있는지 확인
    if (
      !(key1 in landmarkCoordinates) ||
      !(key2 in landmarkCoordinates) ||
      !(key3 in landmarkCoordinates) ||
      !(key4 in landmarkCoordinates)
    ) {
      console.error("❌ 입력된 키가 landmarkCoordinates에 존재하지 않습니다!");
      return null;
    }
  
    // ✅ 2. 좌표 가져오기
    const point1 = landmarkCoordinates[key1]; // 첫 번째 직선의 시작점
    const point2 = landmarkCoordinates[key2]; // 첫 번째 직선의 끝점이자 두 번째 직선의 시작점
    const point3 = landmarkCoordinates[key3]; // 두 번째 직선의 시작점 (key2와 같아야 함)
    const point4 = landmarkCoordinates[key4]; // 두 번째 직선의 끝점
  
    // ✅ 3. 벡터 계산 (P1 -> P2, P3 -> P4)
    const vector1 = { x: point2.x - point1.x, y: point2.y - point1.y }; // 벡터 1 (직선 1)
    const vector2 = { x: point4.x - point3.x, y: point4.y - point3.y }; // 벡터 2 (직선 2)
  
    // ✅ 4. 벡터 내적(점곱) 계산
    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
  
    // ✅ 5. 벡터 크기(길이) 계산
    const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
    const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);
  
    // ✅ 6. 코사인 법칙을 사용하여 내각(°) 계산
    const cosTheta = dotProduct / (magnitude1 * magnitude2);
    const thetaRad = Math.acos(Math.min(Math.max(cosTheta, -1), 1)); // -1 ~ 1 범위로 제한
    const thetaDeg = (thetaRad * 180) / Math.PI;
  
    return Math.round(thetaDeg * 10) / 10; // ✅ 소수점 둘째 자리 반올림
  }
  
  function calculateIntersectionPoint(
    landmarkCoordinates,
    key1,
    key2,
    key3,
    key4
  ) {
    /**
     * 두 직선의 교차점을 계산하는 함수
     *
     * @param {Object} landmarkCoordinates - 좌표를 저장한 딕셔너리
     * @param {string} key1 - 첫 번째 직선의 시작점
     * @param {string} key2 - 첫 번째 직선의 끝점
     * @param {string} key3 - 두 번째 직선의 시작점
     * @param {string} key4 - 두 번째 직선의 끝점
     * @returns {Object|null} - 교차점 {x, y} 또는 null (평행할 경우)
     */
  
    // ✅ 1. 입력된 키가 landmarkCoordinates에 존재하는지 확인
    if (
      !(key1 in landmarkCoordinates) ||
      !(key2 in landmarkCoordinates) ||
      !(key3 in landmarkCoordinates) ||
      !(key4 in landmarkCoordinates)
    ) {
      console.error("❌ 입력된 키가 landmarkCoordinates에 존재하지 않습니다!");
      return null;
    }
  
    // ✅ 2. 좌표 가져오기
    const p1 = landmarkCoordinates[key1]; // 첫 번째 직선의 시작점
    const p2 = landmarkCoordinates[key2]; // 첫 번째 직선의 끝점
    const p3 = landmarkCoordinates[key3]; // 두 번째 직선의 시작점
    const p4 = landmarkCoordinates[key4]; // 두 번째 직선의 끝점
  
    // ✅ 3. 직선의 방정식 구하기: Ax + By = C 형태로 변환
    const A1 = p2.y - p1.y;
    const B1 = p1.x - p2.x;
    const C1 = A1 * p1.x + B1 * p1.y;
  
    const A2 = p4.y - p3.y;
    const B2 = p3.x - p4.x;
    const C2 = A2 * p3.x + B2 * p3.y;
  
    // ✅ 4. 두 직선의 교차점 구하기
    const determinant = A1 * B2 - A2 * B1;
  
    if (determinant === 0) {
      // 직선이 평행하거나 일치할 경우 (교차점 없음)
      console.error("⚠️ 두 직선이 평행하여 교차점이 존재하지 않습니다.");
      return null;
    } else {
      // 크래머의 법칙을 이용하여 교차점 계산
      let x = (C1 * B2 - C2 * B1) / determinant;
      let y = (A1 * C2 - A2 * C1) / determinant;
  
      // ✅ 소수점 한 자리에서 반올림
      x = Math.round(x * 10) / 10;
      y = Math.round(y * 10) / 10;
  
      return { x, y };
    }
  }
  
  function calculateScaleFactor(landmarkCoordinates) {
    /**
     * "Ruler Start"와 "Ruler End" 사이의 거리를 계산하여 scaleFactor(거리/20)를 반환하는 함수
     *
     * @param {Object} landmarkCoordinates - 좌표를 저장한 딕셔너리
     * @returns {number|null} - 변환 비율(scaleFactor, 소수점 한 자리 반올림) 또는 null (좌표 없음)
     */
  
    // ✅ 1. "Ruler Start" 및 "Ruler End" 좌표가 존재하는지 확인
    if (
      !("Ruler Start" in landmarkCoordinates) ||
      !("Ruler End" in landmarkCoordinates)
    ) {
      console.error(
        "❌ 'Ruler Start' 또는 'Ruler End' 키가 landmarkCoordinates에 존재하지 않습니다!"
      );
      return null;
    }
  
    // ✅ 2. 좌표 가져오기
    const start = landmarkCoordinates["Ruler Start"];
    const end = landmarkCoordinates["Ruler End"];
  
    // ✅ 3. 두 점 사이의 거리 계산 (유클리드 거리 공식)
    const dx = end.x - start.x; // x 좌표 차이
    const dy = end.y - start.y; // y 좌표 차이
    const distance = Math.sqrt(dx * dx + dy * dy); // 유클리드 거리 공식 적용
  
    // ✅ 4. 변환 비율 계산 및 소수점 세 자리 반올림
    const scaleFactor = Math.round((20 / distance) * 100) / 100;
  
    return scaleFactor;
  }
  
  function calculateScaledDistanceFromKeys(
    landmarkCoordinates,
    key1,
    key2,
    scaleFactor
  ) {
    /**
     * landmarkCoordinates에서 두 키에 해당하는 좌표를 가져와 거리 계산 후 변환 비율 적용
     *
     * @param {Object} landmarkCoordinates - 좌표를 저장한 딕셔너리
     * @param {string} key1 - 첫 번째 좌표의 키
     * @param {string} key2 - 두 번째 좌표의 키
     * @param {number} scaleFactor - 변환 비율
     * @returns {number|null} - 변환된 거리 (소수점 한 자리에서 반올림) 또는 null (키가 존재하지 않을 경우)
     */
  
    scaleFactor = calculateScaleFactor(landmarkCoordinates);
    if (scaleFactor === null) {
      console.error("❌ 변환 비율이 계산되지 않았습니다!");
      return null;
    }
    console.log("📏 변환 비율(scaleFactor):", scaleFactor);
  
    // ✅ 1. 입력된 키가 landmarkCoordinates에 존재하는지 확인
    if (!(key1 in landmarkCoordinates) || !(key2 in landmarkCoordinates)) {
      console.error(
        `❌ 입력된 키(${key1}, ${key2})가 landmarkCoordinates에 존재하지 않습니다!`
      );
      return null;
    }
  
    // ✅ 2. 좌표 가져오기
    const point1 = landmarkCoordinates[key1]; // 첫 번째 키의 좌표
    const point2 = landmarkCoordinates[key2]; // 두 번째 키의 좌표
  
    // ✅ 3. 두 점 사이의 거리 계산 (유클리드 거리 공식)
    const dx = point2.x - point1.x; // x 좌표 차이
    const dy = point2.y - point1.y; // y 좌표 차이
    const distance = Math.sqrt(dx * dx + dy * dy); // 유클리드 거리 공식 적용
  
    // ✅ 4. 변환 비율 적용 및 소수점 한 자리 반올림
    const scaledDistance = Math.round(distance * scaleFactor * 10) / 10;
  
    return scaledDistance;
  }
  
  function calculatePerpendicularDistance(
    landmarkCoordinates,
    key1,
    key2,
    key3,
    scaleFactor
  ) {
    /**
     * 주어진 두 개의 좌표를 연결하는 직선과, 세 번째 좌표 사이의 수직 거리 계산
     *
     * @param {Object} landmarkCoordinates - 좌표 딕셔너리
     * @param {string} key1 - 직선을 만드는 첫 번째 좌표 키
     * @param {string} key2 - 직선을 만드는 두 번째 좌표 키
     * @param {string} key3 - 수직 거리 계산할 좌표 키
     * @returns {number|null} - 수직 거리 (소수 첫째 자리 반올림) 또는 null (입력 오류)
     */
    scaleFactor = calculateScaleFactor(landmarkCoordinates);
  
    // ✅ 1. 키가 존재하는지 확인
    if (
      !(key1 in landmarkCoordinates) ||
      !(key2 in landmarkCoordinates) ||
      !(key3 in landmarkCoordinates)
    ) {
      console.error("❌ 입력된 키가 landmarkCoordinates에 존재하지 않습니다!");
      return null;
    }
  
    // ✅ 2. 좌표 가져오기
    const p1 = landmarkCoordinates[key1]; // 직선 시작점
    const p2 = landmarkCoordinates[key2]; // 직선 끝점
    const p3 = landmarkCoordinates[key3]; // 수직 거리 측정할 점
  
    // ✅ 3. 직선의 방정식 Ax + By + C = 0 구하기
    const A = p2.y - p1.y; // Δy
    const B = p1.x - p2.x; // -Δx
    const C = A * p1.x + B * p1.y; // 직선 방정식 상수 C
  
    // ✅ 4. 점과 직선 사이의 수직 거리 계산
    const distance = Math.abs(A * p3.x + B * p3.y - C) / Math.sqrt(A * A + B * B);
  
    // ✅ 5. 오른쪽/왼쪽 판별 (외적 사용)
    const crossProduct =
      (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  
    // crossProduct가 양수면 오른쪽(+) / 음수면 왼쪽(-)
    const sign = crossProduct >= 0 ? 1 : -1;
  
    // ✅ 5. scaelFactor 를 구하고 소수 첫째 자리에서 반올림 후 반환
    return Math.round(distance * scaleFactor * sign * 10) / 10;
  }
  
  function calculateXYDifference(landmarkCoordinates, key1, key2) {
    /**
     * 두 좌표 간 x, y 거리 차이를 계산하는 함수
     *
     * @param {Object} landmarkCoordinates - 좌표를 저장한 딕셔너리
     * @param {string} key1 - 첫 번째 좌표 키 (예: "Mx.1 cr")
     * @param {string} key2 - 두 번째 좌표 키 (예: "Mn.1 cr")
     * @returns {Object|null} - { x_diff, y_diff } 또는 null (입력 오류)
     */
  
    scaleFactor = calculateScaleFactor(landmarkCoordinates);
  
    // ✅ 1. 키가 존재하는지 확인
    if (!(key1 in landmarkCoordinates) || !(key2 in landmarkCoordinates)) {
      console.error("❌ 입력된 키가 landmarkCoordinates에 존재하지 않습니다!");
      return null;
    }
  
    // ✅ 2. 두 좌표 가져오기
    const p1 = landmarkCoordinates[key1]; // 첫 번째 좌표
    const p2 = landmarkCoordinates[key2]; // 두 번째 좌표
  
    // ✅ 3. x, y 좌표 차이 계산, scaleFactor 적용
    const x_diff = (Math.round((p2.x - p1.x) * scaleFactor) * 10) / 10;
    const y_diff = (Math.round((p2.y - p1.y) * scaleFactor) * 10) / 10;
  
    return { x_diff, y_diff };
  }
  
  function na_perp_a(landmarkCoordinates) {
    /**
     * Porion과 Orbitale을 잇는 선에 수직이고, Nasion을 지나는 수선과 A-point 사이의 수직 거리 계산
     *
     * @param {Object} landmarkCoordinates - 좌표 저장 객체
     * @param {string} keyPo - Porion (Po) 키
     * @param {string} keyOr - Orbitale (Or) 키
     * @param {string} keyNasion - Nasion (N) 키
     * @param {string} keyApoint - A-point 키
     * @returns {number|null} - 수직 거리 (음수 또는 양수) 또는 null (입력 오류)
     */
    scaleFactor = calculateScaleFactor(landmarkCoordinates);
  
    // ✅ 2. 좌표 가져오기
    const Po = landmarkCoordinates["Porion"]; // Porion 좌표
    const Or = landmarkCoordinates["Orbitale"]; // Orbitale 좌표
    const Nasion = landmarkCoordinates["Nasion"]; // Nasion 좌표
    const Apoint = landmarkCoordinates["A-Point"]; // A-point 좌표
  
    // ✅ 3. Porion - Orbitale 직선의 기울기 계산
    const m = (Or.y - Po.y) / (Or.x - Po.x);
  
    // ✅ 4. Nasion을 지나고 위 직선과 수직인 직선의 방정식 구하기
    const perpendicularSlope = -1 / m; // 수직 기울기
    const A = perpendicularSlope;
    const B = -1;
    const C = -perpendicularSlope * Nasion.x + Nasion.y;
  
    // ✅ 5. 점(A-point)과 이 수선 사이의 수직 거리 공식 적용
    const distance =
      Math.abs(A * Apoint.x + B * Apoint.y + C) / Math.sqrt(A * A + B * B);
  
    // ✅ 방향 판단: 벡터 내적 사용
    const dx = Apoint.x - Nasion.x;
    const dy = Apoint.y - Nasion.y;
    const dot = dx * A + dy * B;
    const sign = dot < 0 ? -1 : 1;
    console.log("📏 수직 거리:", distance * scaleFactor * sign);
    return (Math.round(distance * scaleFactor * 10) / 10) * sign; // 소수 첫째 자리에서 반올림
  }
  
  // ✅ SNA & SNB 계산 후 딕셔너리 반환 함수
  // window.getAngleDictionary = function(landmarkCoordinates) {
  function getAngleDictionary(landmarkCoordinates) {
    /**
     * SNA 및 SNB 내각을 계산하고 딕셔너리 형태로 반환하는 함수.
     *
     * @param {Object} landmarkCoordinates - 좌표를 저장한 딕셔너리
     * @returns {Object} - {"SNA": xx.x, "SNB": xx.x} 형태의 객체
     */
    const Go_Gn = {
      Go: calculateIntersectionPoint(
        landmarkCoordinates,
        "Ar",
        "Ramus Down",
        "Menton",
        "Corpus Lt."
      ),
      Gn: calculateIntersectionPoint(
        landmarkCoordinates,
        "Nasion",
        "Pogonion",
        "Menton",
        "Corpus Lt."
      ),
    };
  
    landmarkCoordinates["Go"] = Go_Gn["Go"];
    console.log("📌 Go 좌표:", Go_Gn["Go"]);
    landmarkCoordinates["Gn"] = Go_Gn["Gn"];
    console.log("📌 Gn 좌표:", Go_Gn["Gn"]);
  
    const angles = {
      SNA: calculateAngle(landmarkCoordinates, "Sella", "Nasion", "A-Point"),
      SNB: calculateAngle(landmarkCoordinates, "Sella", "Nasion", "B-Point"),
      FMIA:
        Math.round(
          (180 -
            calculateIntersectionAngle(
              landmarkCoordinates,
              "Porion",
              "Orbitale",
              "Mn.1 cr",
              "Mn.1 root"
            )) *
            10
        ) / 10,
      FMA:
        Math.round(
          (180 -
            calculateIntersectionAngle(
              landmarkCoordinates,
              "Porion",
              "Orbitale",
              "Menton",
              "Go"
            )) *
            10
        ) / 10,
      "1 to SN": calculateIntersectionAngle(
        landmarkCoordinates,
        "Sella",
        "Nasion",
        "Mx.1 cr",
        "Mx.1 root"
      ),
      IMPA: calculateIntersectionAngle(
        landmarkCoordinates,
        "Go",
        "Menton",
        "Mn.1 cr",
        "Mn.1 root"
      ),
      PMA:
        Math.round(
          (180 -
            calculateIntersectionAngle(
              landmarkCoordinates,
              "ANS",
              "PNS",
              "Go",
              "Menton"
            )) *
            10
        ) / 10,
      "SN-GoMe": calculateIntersectionAngle(
        landmarkCoordinates,
        "Sella",
        "Nasion",
        "Go",
        "Menton"
      ),
      "FA'B'":
        Math.round(
          (180 -
            calculateIntersectionAngle(
              landmarkCoordinates,
              "Porion",
              "Orbitale",
              "soft tissue A",
              "soft tissue B"
            )) *
            10
        ) / 10,
      FABA:
        Math.round(
          (180 -
            calculateIntersectionAngle(
              landmarkCoordinates,
              "Porion",
              "Orbitale",
              "A-Point",
              "B-Point"
            )) *
            10
        ) / 10,
      "Y-angle": calculateIntersectionAngle(
        landmarkCoordinates,
        "Porion",
        "Orbitale",
        "Sella",
        "Gn"
      ),
      UGA: calculateAngle(landmarkCoordinates, "Ar", "Go", "Nasion"),
      LGA: calculateAngle(landmarkCoordinates, "Nasion", "Go", "Menton"),
      "S-A": calculateAngle(landmarkCoordinates, "Nasion", "Sella", "Ar"),
      UIOP: calculateIntersectionAngle(
        landmarkCoordinates,
        "Mn.1 cr",
        "Mn.6 distal",
        "Mx.1 cr",
        "Mx.1 root"
      ),
      MOP:
        Math.round(
          (180 -
            calculateIntersectionAngle(
              landmarkCoordinates,
              "Mn.6 distal",
              "Mn.1 cr",
              "Menton",
              "Go"
            )) *
            10
        ) / 10,
      "FH<Ans": calculateIntersectionAngle(
        landmarkCoordinates,
        "Porion",
        "Orbitale",
        "Sella",
        "ANS"
      ),
      "FH<Pr":
        Math.round(
          (180 -
            calculateIntersectionAngle(
              landmarkCoordinates,
              "Porion",
              "Orbitale",
              "Sella",
              "Porion"
            )) *
            10
        ) / 10,
      "Na-S-BaA": calculateAngle(
        landmarkCoordinates,
        "Nasion",
        "Sella",
        "Basion"
      ),
      "Incisor Overbite": calculateXYDifference(
        landmarkCoordinates,
        "Mn.1 cr",
        "Mx.1 cr"
      ).y_diff,
      "Incisor Overjet": calculateXYDifference(
        landmarkCoordinates,
        "Mn.1 cr",
        "Mx.1 cr"
      ).x_diff,
      NALA: calculateAngle(
        landmarkCoordinates,
        "Columella",
        "Subnasale",
        "soft tissue A"
      ),
      HR: "20",
      Cal: calculateScaleFactor(landmarkCoordinates),
      ACBL: calculateScaledDistanceFromKeys(
        landmarkCoordinates,
        "Sella",
        "Nasion"
      ),
      MBL: calculateScaledDistanceFromKeys(landmarkCoordinates, "Menton", "Go"),
      AFH: calculateScaledDistanceFromKeys(
        landmarkCoordinates,
        "Nasion",
        "Menton"
      ),
      PFH: calculateScaledDistanceFromKeys(landmarkCoordinates, "Sella", "Go"),
      "E-line": -calculatePerpendicularDistance(
        landmarkCoordinates,
        "Pronasale",
        "soft tissue Pogonion",
        "Lower lip"
      ),
      UL: -calculatePerpendicularDistance(
        landmarkCoordinates,
        "Pronasale",
        "soft tissue Pogonion",
        "Upper lip"
      ),
  
      "Ramus height": calculateScaledDistanceFromKeys(
        landmarkCoordinates,
        "Ar",
        "Go"
      ),
      "Naperp-A": na_perp_a(landmarkCoordinates),
      MxBL: calculateScaledDistanceFromKeys(landmarkCoordinates, "ANS", "PNS"),
      PCBL: calculateScaledDistanceFromKeys(
        landmarkCoordinates,
        "Sella",
        "Basion"
      ),
      "S-Por": calculateScaledDistanceFromKeys(
        landmarkCoordinates,
        "Sella",
        "Porion"
      ),
  
      MAB:
        Math.round(
          (180 -
            calculateIntersectionAngle(
              landmarkCoordinates,
              "Menton",
              "Go",
              "A-Point",
              "B-Point"
            )) *
            10
        ) / 10,
      ACBA: calculateIntersectionAngle(
        landmarkCoordinates,
        "Sella",
        "Nasion",
        "Porion",
        "Orbitale"
      ),
      "FH<B":
        Math.round(
          (180 -
            calculateIntersectionAngle(
              landmarkCoordinates,
              "Porion",
              "Orbitale",
              "Sella",
              "Basion"
            )) *
            10
        ) / 10,
      PCBA:
        Math.round(
          (180 -
            calculateIntersectionAngle(
              landmarkCoordinates,
              "Porion",
              "Orbitale",
              "Sella",
              "Ar"
            )) *
            10
        ) / 10,
      FUIA:
        Math.round(
          (180 -
            calculateIntersectionAngle(
              landmarkCoordinates,
              "Porion",
              "Orbitale",
              "Mx.1 cr",
              "Mx.1 root"
            )) *
            10
        ) / 10,
      "AB<LOP": calculateIntersectionAngle(
        landmarkCoordinates,
        "A-Point",
        "B-Point",
        "Mn.1 cr",
        "Mn.6 distal"
      ),
    };
  
    return angles;
  }
  
  function calculateAdditionalAngles(angles, landmarkCoordinates) {
    // ✅ 중간 계산 변수들 먼저 정의
    const PPA = Math.round((angles.FMA - angles.PMA) * 10) / 10;
    const FHR = Math.round((angles.PFH / angles.AFH) * 1000) / 10;
    const MB_ACBL = Math.round((angles.MBL - angles.ACBL) * 10) / 10;
    const FLOPA = Math.round((angles.FMA - angles.MOP) * 10) / 10;
    const APDI = Math.round((angles.FABA + PPA) * 10) / 10;
    const ODI =
      angles.MAB !== undefined ? Math.round((angles.MAB + PPA) * 10) / 10 : null;
  
    // ✅ HGI / VGI 계산 (상수 주석 추가)
    const rawHGI =
      0.2 *
      ((angles.MBL - angles.ACBL) * 2 + // 하악-상악 길이 차이 보정
        (angles.UGA - 50) + // 상악 기울기 보정
        0.5 * (angles.PCBA - 64)); // 하악 뒤쪽 각도 보정
    const HGI = Math.round(rawHGI * 10) / 10;
  
    const rawVGI =
      0.2 *
      ((FHR - 60) * 2 - // 얼굴 높이 보정
        (angles.LGA - 75) + // 하악 각도
        0.5 * (angles.ACBA - 7)); // 하악 중심 각도
    const VGI = Math.round(rawVGI * 10) / 10;
  
    // ✅ AB<LOP 각도 → 라디안 변환 후 코사인
    const a = (3.5 / 4.4) * Math.cos((angles["AB<LOP"] * Math.PI) / 180);
    console.log("📐 AB<LOP 각도 코사인:", a);
  
    // ✅ IAPDI 계산
    let IAPDI;
    if (APDI >= 81) {
      IAPDI =
        angles.PMA < 27.5 ? Math.round((95 - 0.5 * angles.PMA) * 10) / 10 : 81;
    } else {
      IAPDI = Math.round((81 - a * (angles.PMA - 27.5)) * 10) / 10;
    }
    console.log("📏 IAPDI:", IAPDI);
  
    // ✅ APDL 계산
    const rawAPDL = 0.8 * (APDI - IAPDI);
    const APDL = Math.round(rawAPDL * 10) / 10;
  
    const rawIODI =
      80 - 0.3 * angles.PMA - (0.776 - 0.008 * angles.FMA) * (angles.FABA - 80);
    const IODI = Math.round(rawIODI * 10) / 10;
    const rawVDL = 0.4849 * (ODI - IODI);
    const VDL = Math.round(rawVDL * 10) / 10;
    // EI 계산
  
    const IIA = calculateIntersectionAngle(
      landmarkCoordinates,
      "Mx.1 cr",
      "Mx.1 root",
      "Mn.1 cr",
      "Mn.1 root"
    );
    const rawEI = ODI + APDI + (IIA - 125) / 5 - (angles.UL + angles["E-line"]);
  
    const EI = Math.round(rawEI * 10) / 10;
  
    const CFD = Math.round((ODI + APDI - IAPDI - IODI) * 10) / 10;
  
    //IODI 계산
  
    // ✅ 최종 결과 반환
    const additionalAngles = {
      ANB: Math.round((angles.SNA - angles.SNB) * 10) / 10,
      PPA,
      FHR,
      "MB-ACBL": MB_ACBL,
      FLOPA,
      APDI,
      ODI,
      HGI,
      VGI,
      IAPDI,
      APDL,
      IODI,
      VDL,
      EI,
      IIA,
      CFD,
    };
  
    return additionalAngles;
  }
  